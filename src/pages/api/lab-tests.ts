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
      const { data: labTests, error: fetchError } = await supabase
        .from('lab_tests')
        .select('id, name, normal_value, unit, test_group')
        .eq('doctor_id', doctorId)
        .order('name');

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }
      
      // Transform data to match frontend interface
      const transformedData = labTests.map(test => ({
        id: test.id,
        name: test.name,
        normalValue: test.normal_value || '',
        unit: test.unit || '',
        group: test.test_group || ''
      }));
      
      return res.status(200).json(transformedData);

    case 'POST':
      const { name, normalValue, unit, group } = req.body;
      const { data: newLabTest, error: insertError } = await supabase
        .from('lab_tests')
        .insert([{ 
          doctor_id: doctorId, 
          name, 
          normal_value: normalValue || '',
          unit: unit || '',
          test_group: group || ''
        }])
        .select('id, name, normal_value, unit, test_group')
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      const transformedNewTest = {
        id: newLabTest.id,
        name: newLabTest.name,
        normalValue: newLabTest.normal_value || '',
        unit: newLabTest.unit || '',
        group: newLabTest.test_group || ''
      };
      
      return res.status(201).json(transformedNewTest);

    case 'PUT':
      const { id, name: updateName, normalValue: updateNormalValue, unit: updateUnit, group: updateGroup } = req.body;
      const { data: updatedLabTest, error: updateError } = await supabase
        .from('lab_tests')
        .update({ 
          name: updateName, 
          normal_value: updateNormalValue || '',
          unit: updateUnit || '',
          test_group: updateGroup || ''
        })
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('id, name, normal_value, unit, test_group')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      
      const transformedUpdatedTest = {
        id: updatedLabTest.id,
        name: updatedLabTest.name,
        normalValue: updatedLabTest.normal_value || '',
        unit: updatedLabTest.unit || '',
        group: updatedLabTest.test_group || ''
      };
      
      return res.status(200).json(transformedUpdatedTest);

    case 'DELETE':
      const { id: deleteId } = req.body;
      const { error: deleteError } = await supabase
        .from('lab_tests')
        .delete()
        .eq('id', deleteId)
        .eq('doctor_id', doctorId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
      return res.status(200).json({ message: 'Lab test deleted' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
