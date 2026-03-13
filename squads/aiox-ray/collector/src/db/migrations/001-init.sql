-- Migration: 001-init.sql
-- Purpose: Initialize database schema for Event Collector

-- Create events table with full schema
CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  execution_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  duration_ms INTEGER,
  payload JSONB,
  version VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create agents metadata table
CREATE TABLE IF NOT EXISTS agents (
  agent_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create executions table for aggregated data
CREATE TABLE IF NOT EXISTS executions (
  execution_id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  events_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create cot_segments table for chain-of-thought data
CREATE TABLE IF NOT EXISTS cot_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  agent_id VARCHAR(50) NOT NULL,
  segment_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (execution_id) REFERENCES executions(execution_id) ON DELETE CASCADE
);

-- Create indices for performance
-- Index on (agent_id, timestamp DESC) for agent-specific queries
CREATE INDEX IF NOT EXISTS idx_events_agent_timestamp ON events(agent_id, timestamp DESC);

-- Index on execution_id for execution-specific queries
CREATE INDEX IF NOT EXISTS idx_events_execution_id ON events(execution_id);

-- Index on event_type for event type filtering
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Index on timestamp DESC for time-based ordering
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- Index on created_at for 30-day retention cleanup
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Index on execution_id for cot_segments
CREATE INDEX IF NOT EXISTS idx_cot_execution_id ON cot_segments(execution_id);

-- Create partitions for 30-day retention (current month + next month)
-- This allows efficient deletion of old partitions

-- Determine current and next month partitions
DO $$
DECLARE
  current_month_start DATE;
  next_month_start DATE;
  partition_name_current TEXT;
  partition_name_next TEXT;
BEGIN
  current_month_start := DATE_TRUNC('month', CURRENT_DATE);
  next_month_start := current_month_start + INTERVAL '1 month';

  partition_name_current := 'events_' || TO_CHAR(current_month_start, 'YYYY_MM');
  partition_name_next := 'events_' || TO_CHAR(next_month_start, 'YYYY_MM');

  -- Note: Partition logic can be implemented here if needed
  -- For now, we use a simpler approach with cleanup jobs
END $$;

-- Create function for 30-day retention cleanup
CREATE OR REPLACE FUNCTION cleanup_old_events() RETURNS void AS $$
BEGIN
  DELETE FROM events WHERE created_at < NOW() - INTERVAL '30 days';
  RAISE NOTICE 'Cleaned up events older than 30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER events_update_timestamp BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER agents_update_timestamp BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER executions_update_timestamp BEFORE UPDATE ON executions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Insert default agents
INSERT INTO agents (agent_id, name, description) VALUES
  ('dev', 'Developer Agent', 'Implements code and features'),
  ('qa', 'QA Agent', 'Tests and reviews code quality'),
  ('architect', 'Architect Agent', 'Designs system architecture'),
  ('orchestrator', 'Orchestrator Agent', 'Coordinates workflow execution')
ON CONFLICT (agent_id) DO NOTHING;
