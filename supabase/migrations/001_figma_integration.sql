-- Figma Integration Tables
-- This migration creates the necessary tables for Figma integration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Figma connections table
CREATE TABLE IF NOT EXISTS figma_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    figma_file_id VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL, -- Hashed API key for security
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'error', 'inactive')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(figma_file_id)
);

-- Design tokens table
CREATE TABLE IF NOT EXISTS design_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES figma_connections(id) ON DELETE CASCADE,
    token_name VARCHAR(255) NOT NULL,
    token_type VARCHAR(100) NOT NULL CHECK (token_type IN ('color', 'typography', 'spacing', 'shadow', 'border', 'other')),
    token_value JSONB NOT NULL,
    figma_node_id VARCHAR(255),
    css_variable VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, token_name, token_type)
);

-- Component mappings table
CREATE TABLE IF NOT EXISTS component_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES figma_connections(id) ON DELETE CASCADE,
    figma_component_id VARCHAR(255) NOT NULL,
    figma_component_name VARCHAR(255) NOT NULL,
    local_component_path VARCHAR(500) NOT NULL,
    mapping_config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, figma_component_id)
);

-- Sync history table
CREATE TABLE IF NOT EXISTS figma_sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES figma_connections(id) ON DELETE CASCADE,
    sync_type VARCHAR(100) NOT NULL CHECK (sync_type IN ('tokens', 'components', 'full_sync', 'connection_test')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'error', 'in_progress')),
    details TEXT,
    tokens_synced INTEGER DEFAULT 0,
    components_synced INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_figma_connections_user_id ON figma_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_figma_connections_status ON figma_connections(status);
CREATE INDEX IF NOT EXISTS idx_design_tokens_connection_id ON design_tokens(connection_id);
CREATE INDEX IF NOT EXISTS idx_design_tokens_type ON design_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_component_mappings_connection_id ON component_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_component_mappings_status ON component_mappings(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_connection_id ON figma_sync_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_created_at ON figma_sync_history(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_figma_connections_updated_at
    BEFORE UPDATE ON figma_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_tokens_updated_at
    BEFORE UPDATE ON design_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_component_mappings_updated_at
    BEFORE UPDATE ON component_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE figma_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE figma_sync_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Figma connections policies
CREATE POLICY "Users can view their own figma connections" ON figma_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own figma connections" ON figma_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own figma connections" ON figma_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own figma connections" ON figma_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Design tokens policies
CREATE POLICY "Users can view design tokens from their connections" ON design_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = design_tokens.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert design tokens to their connections" ON design_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = design_tokens.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update design tokens from their connections" ON design_tokens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = design_tokens.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete design tokens from their connections" ON design_tokens
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = design_tokens.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

-- Component mappings policies
CREATE POLICY "Users can view component mappings from their connections" ON component_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = component_mappings.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert component mappings to their connections" ON component_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = component_mappings.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update component mappings from their connections" ON component_mappings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = component_mappings.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete component mappings from their connections" ON component_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = component_mappings.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

-- Sync history policies
CREATE POLICY "Users can view sync history from their connections" ON figma_sync_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = figma_sync_history.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sync history to their connections" ON figma_sync_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM figma_connections 
            WHERE figma_connections.id = figma_sync_history.connection_id 
            AND figma_connections.user_id = auth.uid()
        )
    );

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON figma_connections TO authenticated;
GRANT ALL PRIVILEGES ON design_tokens TO authenticated;
GRANT ALL PRIVILEGES ON component_mappings TO authenticated;
GRANT ALL PRIVILEGES ON figma_sync_history TO authenticated;

-- Grant permissions to anon users for read operations (if needed)
GRANT SELECT ON figma_connections TO anon;
GRANT SELECT ON design_tokens TO anon;
GRANT SELECT ON component_mappings TO anon;
GRANT SELECT ON figma_sync_history TO anon;

-- Insert some sample data for testing (optional)
-- This will be commented out in production
/*
INSERT INTO figma_connections (user_id, name, figma_file_id, file_url, api_key_hash, status) VALUES
('00000000-0000-0000-0000-000000000000', 'Test Design System', 'test-file-id-123', 'https://figma.com/file/test-file-id-123', 'hashed-api-key', 'active');

INSERT INTO design_tokens (connection_id, token_name, token_type, token_value, css_variable) VALUES
((SELECT id FROM figma_connections WHERE figma_file_id = 'test-file-id-123'), 'primary-color', 'color', '{"hex": "#007bff", "rgb": [0, 123, 255]}', '--color-primary'),
((SELECT id FROM figma_connections WHERE figma_file_id = 'test-file-id-123'), 'heading-font', 'typography', '{"fontFamily": "Inter", "fontSize": "24px", "fontWeight": "600"}', '--font-heading');
*/

-- Add comments to tables
COMMENT ON TABLE figma_connections IS 'Stores Figma file connections and API configurations';
COMMENT ON TABLE design_tokens IS 'Stores design tokens extracted from Figma files';
COMMENT ON TABLE component_mappings IS 'Maps Figma components to local component files';
COMMENT ON TABLE figma_sync_history IS 'Tracks synchronization history and results';

-- Add comments to important columns
COMMENT ON COLUMN figma_connections.api_key_hash IS 'Hashed version of the Figma API key for security';
COMMENT ON COLUMN design_tokens.token_value IS 'JSON object containing the token value and metadata';
COMMENT ON COLUMN component_mappings.mapping_config IS 'JSON configuration for component mapping rules';
COMMENT ON COLUMN figma_sync_history.details IS 'Detailed information about the sync operation';