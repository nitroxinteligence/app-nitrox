import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function generateRandomMetrics() {
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString();
  });

  for (const date of dates) {
    try {
      console.log(`Inserting data for ${date}`);

      // Lead metrics
      const totalLeads = Math.floor(Math.random() * 100 + 50);
      const qualifiedLeads = Math.floor(Math.random() * totalLeads);
      
      const { error: leadError } = await supabase.from('lead_metrics').insert({
        date,
        total_leads: totalLeads,
        qualified_leads: qualifiedLeads,
        unqualified_leads: totalLeads - qualifiedLeads
      });

      if (leadError) throw leadError;

      // Sales metrics
      const opportunities = Math.floor(Math.random() * 50 + 20);
      const convertedOpps = Math.floor(Math.random() * opportunities);
      const revenue = convertedOpps * (Math.random() * 1000 + 500);
      const totalCost = convertedOpps * (Math.random() * 200 + 100);

      const { error: salesError } = await supabase.from('sales_metrics').insert({
        date,
        total_opportunities: opportunities,
        converted_opportunities: convertedOpps,
        revenue,
        total_cost
      });

      if (salesError) throw salesError;

      // Satisfaction metrics
      const totalResponses = Math.floor(Math.random() * 100 + 30);
      const promoters = Math.floor(Math.random() * (totalResponses * 0.6));
      const passives = Math.floor(Math.random() * (totalResponses - promoters));
      const detractors = totalResponses - promoters - passives;

      const { error: satisfactionError } = await supabase.from('satisfaction_metrics').insert({
        date,
        total_responses: totalResponses,
        promoters,
        passives,
        detractors,
        satisfied_responses: Math.floor(Math.random() * totalResponses),
        positive_sentiments: Math.floor(Math.random() * totalResponses),
        total_sentiments: totalResponses
      });

      if (satisfactionError) throw satisfactionError;

      // Operational metrics
      const interactions = Math.floor(Math.random() * 200 + 100);
      const selfService = Math.floor(Math.random() * interactions);

      const { error: operationalError } = await supabase.from('operational_metrics').insert({
        date,
        total_interactions: interactions,
        self_service_interactions: selfService,
        fallback_interactions: Math.floor(Math.random() * (interactions - selfService)),
        technical_errors: Math.floor(Math.random() * 10),
        total_resolution_time: Math.floor(Math.random() * 3600),
        resolved_interactions: Math.floor(Math.random() * interactions)
      });

      if (operationalError) throw operationalError;

      // Retention metrics
      const totalUsers = Math.floor(Math.random() * 1000 + 500);
      const returningUsers = Math.floor(Math.random() * totalUsers);

      const { error: retentionError } = await supabase.from('retention_metrics').insert({
        date,
        total_users: totalUsers,
        returning_users: returningUsers,
        churned_users: Math.floor(Math.random() * (totalUsers - returningUsers)),
        total_sessions: Math.floor(Math.random() * (totalUsers * 3))
      });

      if (retentionError) throw retentionError;

      console.log(`Successfully inserted data for ${date}`);
    } catch (error) {
      console.error(`Error inserting data for ${date}:`, error);
      throw error;
    }
  }
}

// Execute the function
generateRandomMetrics()
  .then(() => {
    console.log('Sample data inserted successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error inserting sample data:', error);
    process.exit(1);
  }); 