import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const doctorId = req.headers.authorization;

  if (!doctorId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (method) {
    case 'GET':
      const { date } = req.query;
      
      let query = supabase
        .from('observations')
        .select(`
          id, 
          report_date, 
          report_name, 
          parameters,
          patients!inner(id, name, opno)
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (date) {
        query = query.eq('report_date', date);
      }

      const { data: reports, error: fetchError } = await query;

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }
      
      return res.status(200).json(reports || []);

    case 'PUT':
      const { id, patient_id: updatePatientId, report_date: updateDate, report_name: updateName, parameters: updateParams } = req.body;
      
      const { data: updatedReport, error: updateError } = await supabase
        .from('observations')
        .update({ 
          patient_id: updatePatientId,
          report_date: updateDate,
          report_name: updateName,
          parameters: updateParams
        })
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select(`
          id, 
          report_date, 
          report_name, 
          parameters,
          patients!inner(id, name, opno)
        `)
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      
      return res.status(200).json(updatedReport);

    case 'DELETE':
      const { id: deleteId } = req.body;
      const { error: deleteError } = await supabase
        .from('observations')
        .delete()
        .eq('id', deleteId)
        .eq('doctor_id', doctorId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
      return res.status(200).json({ message: 'Report deleted' });

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
