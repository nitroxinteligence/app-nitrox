// Simple test script to test Supabase connection and insertion
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://dkvqjisxtdlrdgseiooq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdnFqaXN4dGRscmRnc2Vpb29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzg2MDY5NSwiZXhwIjoyMDUzNDM2Njk1fQ.kFV65mUt9ljbP9sFaaKQ7JlzL5aiEf-ZOsgdmOk1Lqo';

async function testSupabaseInsertion() {
  console.log('Starting Supabase test...');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Supabase Key Length:', SUPABASE_SERVICE_KEY.length);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Create a unique test ID
  const uniqueTestId = `test-script-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Create test record
  const testRecord = {
    workflow_id: "test-workflow-script",
    workflow_name: "Test Workflow Script",
    node_name: "Test Node Script",
    timestamp: new Date().toISOString(),
    model: "gpt-3.5-turbo",
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
    estimated_cost: 0.0001,
    request_id: uniqueTestId
  };
  
  console.log('Test record to insert:', JSON.stringify(testRecord));
  
  try {
    // Insert test record
    console.log('Inserting test record...');
    const { data, error } = await supabase
      .from('openai_usage')
      .insert([testRecord]);
    
    if (error) {
      console.error('Error inserting test record:', error);
    } else {
      console.log('Test record inserted successfully!');
    }
    
    // Verify insertion
    console.log('Verifying insertion...');
    const { data: checkData, error: checkError } = await supabase
      .from('openai_usage')
      .select('*')
      .eq('request_id', uniqueTestId)
      .limit(1);
    
    if (checkError) {
      console.error('Error verifying insertion:', checkError);
    } else if (checkData && checkData.length > 0) {
      console.log('Record found in verification:', JSON.stringify(checkData[0]));
    } else {
      console.error('Record NOT found in verification!');
    }
  } catch (error) {
    console.error('Exception during test:', error);
  }
}

// Run the test
testSupabaseInsertion()
  .then(() => console.log('Test completed.'))
  .catch(error => console.error('Test failed:', error));
