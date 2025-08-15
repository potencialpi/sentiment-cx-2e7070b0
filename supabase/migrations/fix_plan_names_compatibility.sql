-- Fix plan names compatibility between database and code
-- Database has underscores, code uses hyphens

-- Update profiles table
ALTER TABLE profiles ALTER COLUMN plan_name SET DEFAULT 'start-quantico';

-- Update existing records in profiles table
UPDATE profiles 
SET plan_name = CASE 
    WHEN plan_name = 'start_quantico' THEN 'start-quantico'
    WHEN plan_name = 'vortex_neural' THEN 'vortex-neural'
    WHEN plan_name = 'nexus_infinito' THEN 'nexus-infinito'
    ELSE plan_name
END
WHERE plan_name IN ('start_quantico', 'vortex_neural', 'nexus_infinito');

-- Update companies table if it has plan_name column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'plan_name') THEN
        -- Update default value
        ALTER TABLE companies ALTER COLUMN plan_name SET DEFAULT 'start-quantico';
        
        -- Update existing records
        UPDATE companies 
        SET plan_name = CASE 
            WHEN plan_name = 'start_quantico' THEN 'start-quantico'
            WHEN plan_name = 'vortex_neural' THEN 'vortex-neural'
            WHEN plan_name = 'nexus_infinito' THEN 'nexus-infinito'
            ELSE plan_name
        END
        WHERE plan_name IN ('start_quantico', 'vortex_neural', 'nexus_infinito');
    END IF;
END $$;

-- Verify the changes
SELECT 'profiles' as table_name, plan_name, COUNT(*) as count
FROM profiles 
GROUP BY plan_name
UNION ALL
SELECT 'companies' as table_name, plan_name, COUNT(*) as count
FROM companies 
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'plan_name')
GROUP BY plan_name;