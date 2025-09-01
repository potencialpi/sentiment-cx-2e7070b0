-- Migração para criar tabela audit_logs
-- Sistema de auditoria para conformidade LGPD
-- Rastreabilidade de ações e controle de acesso a dados pessoais

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    details JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints para validação
    CONSTRAINT audit_logs_action_check CHECK (action IN (
        'INSERT', 'UPDATE', 'DELETE', 'SELECT', 
        'LOGIN', 'LOGOUT', 'MAGIC_LINK_GENERATED', 
        'MAGIC_LINK_USED', 'DATA_EXPORT', 'DATA_DELETE',
        'cleanup_expired_magic_links', 'GDPR_REQUEST'
    ))
);

-- Índices para performance e consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON public.audit_logs(ip_address);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas administradores podem ver logs de auditoria
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND subscription_plan IN ('nexus_infinito')
        )
    );

-- Política RLS: Usuários podem ver apenas seus próprios logs
CREATE POLICY "audit_logs_own_access" ON public.audit_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Função para registrar ações de auditoria
CREATE OR REPLACE FUNCTION log_audit_action(
    p_action VARCHAR(100),
    p_table_name VARCHAR(50),
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, 
        old_values, new_values, details, 
        ip_address, user_agent, created_at
    )
    VALUES (
        auth.uid(), p_action, p_table_name, p_record_id,
        p_old_values, p_new_values, p_details,
        p_ip_address, p_user_agent, NOW()
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpeza de logs antigos (retenção de 2 anos conforme LGPD)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Manter logs por 2 anos (730 dias) conforme LGPD
    DELETE FROM public.audit_logs 
    WHERE created_at < NOW() - INTERVAL '730 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da própria limpeza
    INSERT INTO public.audit_logs (action, table_name, details, created_at)
    VALUES (
        'cleanup_old_audit_logs',
        'audit_logs',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_period', '730 days'
        ),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria automática em tabelas sensíveis
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM log_audit_action(
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD)::jsonb,
            NULL,
            jsonb_build_object('trigger', 'auto')
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_action(
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            jsonb_build_object('trigger', 'auto')
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM log_audit_action(
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb,
            jsonb_build_object('trigger', 'auto')
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoria em tabelas sensíveis
CREATE TRIGGER audit_magic_links_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.magic_links
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_responses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.responses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Comentários para documentação
COMMENT ON TABLE public.audit_logs IS 'Tabela de auditoria para conformidade LGPD - rastreabilidade de ações';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID do usuário que executou a ação';
COMMENT ON COLUMN public.audit_logs.action IS 'Tipo de ação executada';
COMMENT ON COLUMN public.audit_logs.table_name IS 'Nome da tabela afetada';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Valores anteriores (para UPDATE/DELETE)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'Novos valores (para INSERT/UPDATE)';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Endereço IP do usuário';
COMMENT ON FUNCTION log_audit_action IS 'Função para registrar ações de auditoria manualmente';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Função para limpeza de logs antigos - retenção de 2 anos LGPD';