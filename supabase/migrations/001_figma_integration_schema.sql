-- Figma Integration Database Schema
-- This migration creates the necessary tables for Figma integration functionality

-- Create figma_connections table
CREATE TABLE IF NOT EXISTS figma_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    last_synced TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for figma_connections
CREATE INDEX IF NOT EXISTS idx_figma_connections_file_id ON figma_connections(file_id);
CREATE INDEX IF NOT EXISTS idx_figma_connections_active ON figma_connections(is_active);

-- Create design_tokens table
CREATE TABLE IF NOT EXISTS design_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES figma_connections(id) ON DELETE CASCADE,
    token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('colors', 'typography', 'spacing', 'shadows')),
    token_name VARCHAR(255) NOT NULL,
    token_value JSONB NOT NULL,
    figma_node_id VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for design_tokens
CREATE INDEX IF NOT EXISTS idx_design_tokens_connection ON design_tokens(connection_id);
CREATE INDEX IF NOT EXISTS idx_design_tokens_type ON design_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_design_tokens_name ON design_tokens(token_name);

-- Create component_mappings table
CREATE TABLE IF NOT EXISTS component_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES figma_connections(id) ON DELETE CASCADE,
    figma_component_id VARCHAR(255) NOT NULL,
    react_component_name VARCHAR(255) NOT NULL,
    prop_mappings JSONB DEFAULT '{}',
    auto_sync BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for component_mappings
CREATE INDEX IF NOT EXISTS idx_component_mappings_connection ON component_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_component_mappings_figma_id ON component_mappings(figma_component_id);

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES figma_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('tokens', 'components', 'full')),
    changes JSONB DEFAULT '{}',
    success BOOLEAN NOT NULL,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sync_history
CREATE INDEX IF NOT EXISTS idx_sync_history_connection ON sync_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_date ON sync_history(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_success ON sync_history(success);

-- Enable Row Level Security (RLS)
ALTER TABLE figma_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can manage their own figma connections" ON figma_connections
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own design tokens" ON design_tokens
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own component mappings" ON component_mappings
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own sync history" ON sync_history
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own sync history" ON sync_history
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions to authenticated role
GRANT ALL PRIVILEGES ON figma_connections TO authenticated;
GRANT ALL PRIVILEGES ON design_tokens TO authenticated;
GRANT ALL PRIVILEGES ON component_mappings TO authenticated;
GRANT ALL PRIVILEGES ON sync_history TO authenticated;

-- Grant basic read access to anon role for public data
GRANT SELECT ON figma_connections TO anon;
GRANT SELECT ON design_tokens TO anon;
GRANT SELECT ON component_mappings TO anon;
GRANT SELECT ON sync_history TO anon;