-- Test RLS Data Isolation
-- This script tests if users can only see their own data

-- Test 1: Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename;

-- Test 2: Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('surveys', 'responses', 'profiles')
ORDER BY tablename, policyname;

-- Test 3: Check table permissions for anon and authenticated roles
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('surveys', 'responses', 'profiles')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- Test 4: Verify surveys table structure and sample data (without exposing sensitive info)
SELECT 
    COUNT(*) as total_surveys,
    COUNT(DISTINCT user_id) as unique_users,
    status,
    COUNT(*) as surveys_per_status
FROM surveys 
GROUP BY status;

-- Test 5: Check if there are any surveys without user_id (data integrity issue)
SELECT COUNT(*) as surveys_without_user_id
FROM surveys 
WHERE user_id IS NULL;

-- Test 6: Check responses table structure
SELECT 
    COUNT(*) as total_responses,
    COUNT(DISTINCT survey_id) as surveys_with_responses
FROM responses;

-- Test 7: Check profiles table
SELECT 
    COUNT(*) as total_profiles,
    COUNT(DISTINCT user_id) as unique_user_profiles
FROM profiles;