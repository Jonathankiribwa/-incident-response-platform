#!/usr/bin/env python3
"""
Main entry point for the ML Pipeline service.
Handles alert classification, threat analysis, and runbook suggestions.
"""

import asyncio
import logging
import signal
import sys
from typing import Dict, Any
import os

from dotenv import load_dotenv
from loguru import logger

from config.settings import Settings
from services.kafka_service import KafkaService
from services.alert_classifier import AlertClassifier
from services.threat_analyzer import ThreatAnalyzer
from services.runbook_suggester import RunbookSuggester
from services.model_manager import ModelManager
from utils.metrics import MetricsCollector

# Load environment variables
load_dotenv()

if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

class MLPipeline:
    """Main ML Pipeline orchestrator."""
    
    def __init__(self):
        self.settings = Settings()
        self.kafka_service = None
        self.alert_classifier = None
        self.threat_analyzer = None
        self.runbook_suggester = None
        self.model_manager = None
        self.metrics_collector = None
        self.running = False
        self.shutdown_event = asyncio.Event()
        
        # Configure logging
        self._setup_logging()
        
    def _setup_logging(self):
        """Configure structured logging."""
        logger.remove()
        logger.add(
            sys.stdout,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}",
            level=self.settings.log_level,
            colorize=True
        )
        logger.add(
            "logs/ml_pipeline.log",
            rotation="10 MB",
            retention="7 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
        )
        
    async def initialize(self):
        """Initialize all services."""
        try:
            logger.info("Initializing ML Pipeline...")
            
            # Initialize metrics collector
            self.metrics_collector = MetricsCollector()
            
            # Initialize model manager
            self.model_manager = ModelManager(self.settings)
            await self.model_manager.load_models()
            
            # Initialize ML services
            self.alert_classifier = AlertClassifier(self.model_manager)
            self.threat_analyzer = ThreatAnalyzer(self.model_manager)
            self.runbook_suggester = RunbookSuggester(self.model_manager)
            
            # Initialize Kafka service
            self.kafka_service = KafkaService(
                brokers=self.settings.kafka_brokers,
                alert_classifier=self.alert_classifier,
                threat_analyzer=self.threat_analyzer,
                runbook_suggester=self.runbook_suggester,
                metrics_collector=self.metrics_collector
            )
            
            logger.info("ML Pipeline initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize ML Pipeline: {e}")
            raise
            
    async def start(self):
        """Start the ML pipeline."""
        try:
            logger.info("Starting ML Pipeline...")
            self.running = True
            
            # Start Kafka consumer
            if self.kafka_service:
                await self.kafka_service.start()
            
            # Start metrics collection
            if self.metrics_collector:
                await self.metrics_collector.start()
            
            logger.info("ML Pipeline started successfully")
            
            # Wait for shutdown event
            await self.shutdown_event.wait()
            
        except Exception as e:
            logger.error(f"Error in ML Pipeline: {e}")
            raise
            
    async def stop(self):
        """Stop the ML pipeline gracefully."""
        logger.info("Stopping ML Pipeline...")
        self.running = False
        self.shutdown_event.set()
        
        if self.kafka_service:
            await self.kafka_service.stop()
            
        if self.metrics_collector:
            await self.metrics_collector.stop()
            
        logger.info("ML Pipeline stopped")
        
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down gracefully...")
            self.shutdown_event.set()
            
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

async def main():
    """Main entry point."""
    pipeline = MLPipeline()
    
    try:
        # Setup signal handlers
        pipeline._setup_signal_handlers()
        
        # Initialize and start pipeline
        await pipeline.initialize()
        await pipeline.start()
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)
    finally:
        await pipeline.stop()

if __name__ == "__main__":
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Run the pipeline
    asyncio.run(main()) 