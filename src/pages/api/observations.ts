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
      const { patient_id } = req.query;
      
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
        .order('report_date', { ascending: false });

      if (patient_id) {
        query = query.eq('patient_id', patient_id);
      }

      const { data: observations, error: fetchError } = await query;

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }
      
      return res.status(200).json(observations || []);

    case 'POST':
      const { patient_id: newPatientId, report_date, report_name, parameters } = req.body;
      
      const { data: newObservation, error: insertError } = await supabase
        .from('observations')
        .insert([{ 
          doctor_id: doctorId, 
          patient_id: newPatientId,
          report_date,
          report_name,
          parameters
        }])
        .select(`
          id, 
          report_date, 
          report_name, 
          parameters,
          patients!inner(id, name, opno)
        `)
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      return res.status(201).json(newObservation);

    case 'PUT':
      const { id, patient_id: updatePatientId, report_date: updateDate, report_name: updateName, parameters: updateParams } = req.body;
      
      const { data: updatedObservation, error: updateError } = await supabase
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
      
      return res.status(200).json(updatedObservation);

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
      return res.status(200).json({ message: 'Observation deleted' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
