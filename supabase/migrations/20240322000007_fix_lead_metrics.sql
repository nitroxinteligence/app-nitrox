-- Corrigir dados existentes na tabela lead_metrics
UPDATE lead_metrics
SET total_leads = GREATEST(qualified_leads + unqualified_leads, total_leads)
WHERE qualified_leads + unqualified_leads > total_leads;

-- Adicionar trigger para validação de dados
CREATE OR REPLACE FUNCTION validate_lead_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Garantir que total_leads seja pelo menos igual à soma de qualified_leads e unqualified_leads
    IF NEW.qualified_leads + NEW.unqualified_leads > NEW.total_leads THEN
        NEW.total_leads := NEW.qualified_leads + NEW.unqualified_leads;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_valid_lead_counts
    BEFORE INSERT OR UPDATE ON lead_metrics
    FOR EACH ROW
    EXECUTE FUNCTION validate_lead_metrics(); 