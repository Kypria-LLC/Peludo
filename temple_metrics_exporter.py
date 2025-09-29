#!/usr/bin/env python3
"""
🏛️ TEMPLE OF KYPRIA - SACRED METRICS EXPORTER
Ceremonial Python service to expose Temple metrics to Prometheus
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyncpg
from prometheus_client import (
    Counter, Gauge, Histogram, Info, 
    start_http_server, generate_latest, CONTENT_TYPE_LATEST
)
from aiohttp import web
import json

# === SACRED METRICS DEFINITIONS ===

# Core Temple metrics
temple_active_members = Gauge('temple_active_members_total', 'Current active Temple members')
temple_total_roles_granted = Gauge('temple_total_roles_granted', 'Total roles ever granted')
temple_member_joins = Counter('temple_member_joins_total', 'New member joins')
temple_member_departures = Counter('temple_member_departures_total', 'Member departures')

# Discord role metrics
discord_user_role_count = Gauge('discord_user_role_count', 'Current user role assignments', ['role'])
discord_role_events = Counter('discord_role_events_total', 'Role change events', ['action', 'role'])

# Webhook processing metrics
webhook_events = Counter('webhook_events_total', 'Webhook events received', ['source', 'event_type'])
webhook_processing_duration = Histogram(
    'webhook_processing_duration_seconds', 
    'Time to process webhook events',
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Ledger integrity metrics
ledger_consistency_check_failures = Gauge('ledger_consistency_check_failures', 'Consistency check failures')
webhook_audit_unprocessed_count = Gauge('webhook_audit_unprocessed_count', 'Unprocessed audit entries')
ledger_sync_errors = Counter('ledger_sync_errors_total', 'Ledger synchronization errors')

# Performance metrics
temple_api_requests = Counter('temple_api_requests_total', 'API requests', ['method', 'endpoint', 'status'])
temple_api_request_duration = Histogram('temple_api_request_duration_seconds', 'API request duration')
temple_errors = Counter('temple_errors_total', 'Application errors', ['error_type'])

# External service health
discord_api_up = Gauge('discord_api_up', 'Discord API health status')
patreon_api_up = Gauge('patreon_api_up', 'Patreon API health status')

# Database metrics
pg_connections_active = Gauge('pg_connections_active', 'Active database connections')
pg_connections_total = Gauge('pg_connections_total', 'Total database connections')
pg_table_size_bytes = Gauge('pg_table_size_bytes', 'Table size in bytes', ['table'])

class TempleMetricsExporter:
    """Sacred metrics collection and exposition service"""
    
    def __init__(self, database_url: str, port: int = 9090):
        self.database_url = database_url
        self.port = port
        self.db_pool: Optional[asyncpg.Pool] = None
        self.logger = logging.getLogger(__name__)
        
    async def initialize(self):
        """Initialize database connection pool"""
        self.logger.info("🏛️ Initializing Temple metrics exporter...")
        self.db_pool = await asyncpg.create_pool(self.database_url)
        
    async def collect_temple_metrics(self):
        """Collect core Temple membership and activity metrics"""
        async with self.db_pool.acquire() as conn:
            try:
                # Active members
                active_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM temple_member_status WHERE status = 'active'"
                )
                temple_active_members.set(active_count)
                
                # Total roles granted
                total_roles = await conn.fetchval(
                    "SELECT COUNT(*) FROM discord_user_current_roles"
                )
                temple_total_roles_granted.set(total_roles)
                
                # Role distribution
                roles_data = await conn.fetch(
                    "SELECT role, COUNT(*) as count FROM discord_user_current_roles GROUP BY role"
                )
                for row in roles_data:
                    discord_user_role_count.labels(role=row['role']).set(row['count'])
                    
                self.logger.debug(f"📊 Temple metrics: {active_count} active members, {total_roles} roles")
                
            except Exception as e:
                self.logger.error(f"❌ Error collecting Temple metrics: {e}")
                temple_errors.labels(error_type="metrics_collection").inc()
    
    async def collect_ledger_metrics(self):
        """Collect audit trail and consistency metrics"""
        async with self.db_pool.acquire() as conn:
            try:
                # Unprocessed audit entries
                unprocessed = await conn.fetchval(
                    "SELECT COUNT(*) FROM webhook_audit_log WHERE processed_at IS NULL"
                )
                webhook_audit_unprocessed_count.set(unprocessed)
                
                # Consistency check (simplified version)
                consistency_issues = await conn.fetchval("""
                    WITH audit_roles AS (
                        SELECT DISTINCT user_id, target as role
                        FROM webhook_audit_log 
                        WHERE event_type = 'discord_role_change' 
                          AND action = 'added'
                          AND NOT EXISTS (
                            SELECT 1 FROM webhook_audit_log w2
                            WHERE w2.user_id = webhook_audit_log.user_id
                              AND w2.target = webhook_audit_log.target
                              AND w2.action = 'removed'
                              AND w2.timestamp > webhook_audit_log.timestamp
                          )
                    ),
                    derived_roles AS (
                        SELECT user_id, role FROM discord_user_current_roles
                    )
                    SELECT COUNT(*) FROM (
                        (SELECT user_id, role FROM audit_roles EXCEPT SELECT user_id, role FROM derived_roles)
                        UNION ALL
                        (SELECT user_id, role FROM derived_roles EXCEPT SELECT user_id, role FROM audit_roles)
                    ) inconsistencies
                """)
                ledger_consistency_check_failures.set(consistency_issues)
                
                self.logger.debug(f"⚖️ Ledger metrics: {unprocessed} unprocessed, {consistency_issues} inconsistencies")
                
            except Exception as e:
                self.logger.error(f"❌ Error collecting ledger metrics: {e}")
                temple_errors.labels(error_type="ledger_metrics").inc()
    
    async def collect_performance_metrics(self):
        """Collect database and system performance metrics"""
        async with self.db_pool.acquire() as conn:
            try:
                # Database connections
                db_stats = await conn.fetchrow("""
                    SELECT 
                        (SELECT count(*) FROM pg_stat_activity) as total_connections,
                        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
                """)
                pg_connections_total.set(db_stats['total_connections'])
                pg_connections_active.set(db_stats['active_connections'])
                
                # Table sizes
                table_sizes = await conn.fetch("""
                    SELECT 
                        schemaname||'.'||tablename as table_name,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                    FROM pg_tables 
                    WHERE schemaname = 'public' 
                      AND tablename IN ('webhook_audit_log', 'discord_user_current_roles', 'temple_member_status')
                """)
                
                for row in table_sizes:
                    pg_table_size_bytes.labels(table=row['table_name']).set(row['size_bytes'])
                    
            except Exception as e:
                self.logger.error(f"❌ Error collecting performance metrics: {e}")
                temple_errors.labels(error_type="performance_metrics").inc()
    
    async def check_external_services(self):
        """Check health of external APIs"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Discord API check
                try:
                    async with session.get('https://discord.com/api/v10/gateway', timeout=5) as resp:
                        discord_api_up.set(1 if resp.status == 200 else 0)
                except:
                    discord_api_up.set(0)
                
                # Patreon API check (if configured)
                try:
                    async with session.get('https://www.patreon.com/api/oauth2/v2/campaigns', timeout=5) as resp:
                        patreon_api_up.set(1 if resp.status in [200, 401] else 0)  # 401 = unauthorized but service up
                except:
                    patreon_api_up.set(0)
                    
        except Exception as e:
            self.logger.error(f"❌ Error checking external services: {e}")
            discord_api_up.set(0)
            patreon_api_up.set(0)
    
    async def metrics_collection_loop(self):
        """Main metrics collection loop"""
        self.logger.info("🔄 Starting metrics collection loop...")
        
        while True:
            try:
                start_time = time.time()
                
                # Collect all metric categories
                await asyncio.gather(
                    self.collect_temple_metrics(),
                    self.collect_ledger_metrics(),
                    self.collect_performance_metrics(),
                    self.check_external_services()
                )
                
                collection_duration = time.time() - start_time
                self.logger.debug(f"📊 Metrics collection completed in {collection_duration:.2f}s")
                
                # Wait before next collection
                await asyncio.sleep(30)  # Collect every 30 seconds
                
            except Exception as e:
                self.logger.error(f"❌ Error in metrics collection loop: {e}")
                await asyncio.sleep(60)  # Longer wait on error
    
    async def start_server(self):
        """Start the metrics HTTP server"""
        app = web.Application()
        app.router.add_get('/metrics', self.metrics_handler)
        app.router.add_get('/health', self.health_handler)
        app.router.add_get('/', self.index_handler)
        
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', self.port)
        await site.start()
        
        self.logger.info(f"🌐 Metrics server started on port {self.port}")
    
    async def metrics_handler(self, request):
        """Handle /metrics endpoint"""
        return web.Response(text=generate_latest().decode('utf-8'), content_type=CONTENT_TYPE_LATEST)
    
    async def health_handler(self, request):
        """Handle /health endpoint"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected" if self.db_pool else "disconnected",
            "metrics_port": self.port
        }
        return web.json_response(health_status)
    
    async def index_handler(self, request):
        """Handle root endpoint with Temple info"""
        info_html = """
        <html>
        <head><title>🏛️ Temple Metrics Exporter</title></head>
        <body>
            <h1>🏛️ Temple of Kypria - Metrics Exporter</h1>
            <p>Sacred monitoring service for the Temple's operational metrics</p>
            <ul>
                <li><a href="/metrics">📊 Prometheus Metrics</a></li>
                <li><a href="/health">💓 Health Check</a></li>
            </ul>
            <hr>
            <p><em>May your metrics be ever truthful and your dashboards ever insightful</em> ⚖️</p>
        </body>
        </html>
        """
        return web.Response(text=info_html, content_type='text/html')
    
    async def run(self):
        """Main entry point"""
        await self.initialize()
        await self.start_server()
        
        # Start background metrics collection
        await self.metrics_collection_loop()

class WebhookMetricsMiddleware:
    """Middleware to track webhook processing metrics"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def process_webhook(self, source: str, event_type: str, processing_func, *args, **kwargs):
        """Wrap webhook processing with metrics collection"""
        start_time = time.time()
        
        try:
            # Count the incoming event
            webhook_events.labels(source=source, event_type=event_type).inc()
            
            # Execute the processing function
            result = await processing_func(*args, **kwargs)
            
            # Record successful processing
            processing_time = time.time() - start_time
            webhook_processing_duration.observe(processing_time)
            
            self.logger.info(f"✅ Processed {source}/{event_type} in {processing_time:.3f}s")
            return result
            
        except Exception as e:
            # Record the error
            temple_errors.labels(error_type="webhook_processing").inc()
            self.logger.error(f"❌ Error processing {source}/{event_type}: {e}")
            raise

# === CEREMONIAL USAGE EXAMPLE ===

async def main():
    """Example usage of the Temple metrics exporter"""
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Database connection string (adjust for your setup)
    DATABASE_URL = "postgresql://user:password@localhost:5432/temple_db"
    
    # Initialize and run the exporter
    exporter = TempleMetricsExporter(DATABASE_URL, port=9090)
    
    try:
        await exporter.run()
    except KeyboardInterrupt:
        print("\n🏛️ Temple metrics exporter shutting down gracefully...")
    except Exception as e:
        print(f"❌ Fatal error: {e}")

if __name__ == "__main__":
    asyncio.run(main())