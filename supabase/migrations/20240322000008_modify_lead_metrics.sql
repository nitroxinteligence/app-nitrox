-- Primeiro, remover a coluna conversion_rate existente
ALTER TABLE lead_metrics DROP COLUMN IF EXISTS conversion_rate;

-- Adicionar a nova coluna conversion_rate como coluna computada
ALTER TABLE lead_metrics ADD COLUMN conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
        WHEN total_leads > 0 THEN 
            ROUND((qualified_leads::DECIMAL / total_leads::DECIMAL * 100)::DECIMAL, 2)
        ELSE 0 
    END
) STORED;

-- Corrigir dados existentes
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

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS ensure_valid_lead_counts ON lead_metrics;

-- Criar o novo trigger
CREATE TRIGGER ensure_valid_lead_counts
    BEFORE INSERT OR UPDATE ON lead_metrics
    FOR EACH ROW
    EXECUTE FUNCTION validate_lead_metrics(); 