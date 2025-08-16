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
      const { data: patients, error: fetchError } = await supabase
        .from('patients')
        .select('id, opno, name, age, gender, address, created_at')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }
      
      return res.status(200).json(patients || []);

    case 'POST':
      const { opno, name, age, gender, address } = req.body;
      
      // Generate next OPNO if not provided
      let finalOpno = opno;
      if (!opno) {
        const { data: lastPatient } = await supabase
          .from('patients')
          .select('opno')
          .eq('doctor_id', doctorId)
          .order('opno', { ascending: false })
          .limit(1);
        
        const lastOpno = lastPatient?.[0]?.opno || '000000';
        const nextNum = parseInt(lastOpno) + 1;
        finalOpno = nextNum.toString().padStart(6, '0');
      }

      const { data: newPatient, error: insertError } = await supabase
        .from('patients')
        .insert([{ 
          doctor_id: doctorId, 
          opno: finalOpno,
          name: name.substring(0, 100),
          age: parseInt(age),
          gender,
          address: address ? address.substring(0, 100) : ''
        }])
        .select('id, opno, name, age, gender, address, created_at')
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      return res.status(201).json(newPatient);

    case 'PUT':
      const { id, opno: updateOpno, name: updateName, age: updateAge, gender: updateGender, address: updateAddress } = req.body;
      const { data: updatedPatient, error: updateError } = await supabase
        .from('patients')
        .update({ 
          opno: updateOpno,
          name: updateName.substring(0, 100),
          age: parseInt(updateAge),
          gender: updateGender,
          address: updateAddress ? updateAddress.substring(0, 100) : ''
        })
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('id, opno, name, age, gender, address, created_at')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      
      return res.status(200).json(updatedPatient);

    case 'DELETE':
      const { id: deleteId } = req.body;
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', deleteId)
        .eq('doctor_id', doctorId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
      return res.status(200).json({ message: 'Patient deleted' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
