import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing environment variables'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('orcid_id', '0000-0001-2345-6789')
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database connection successful! ✅',
      user: {
        display_name: data.display_name,
        orcid_id: data.orcid_id,
        credit_balance: data.credit_balance,
        created_at: data.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
