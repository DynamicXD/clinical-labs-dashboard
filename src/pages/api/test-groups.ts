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
      const { data: testGroups, error: fetchError } = await supabase
        .from('test_groups')
        .select('id, name, method_used, specimen')
        .eq('doctor_id', doctorId)
        .order('id');

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }
      
      // Transform data to match frontend interface
      const transformedData = testGroups.map(group => ({
        id: group.id,
        name: group.name,
        methodUsed: group.method_used || '',
        specimen: group.specimen || ''
      }));
      
      return res.status(200).json(transformedData);

    case 'POST':
      const { name, methodUsed, specimen } = req.body;
      const { data: newTestGroup, error: insertError } = await supabase
        .from('test_groups')
        .insert([{ 
          doctor_id: doctorId, 
          name, 
          method_used: methodUsed || '',
          specimen: specimen || ''
        }])
        .select('id, name, method_used, specimen')
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      const transformedNewGroup = {
        id: newTestGroup.id,
        name: newTestGroup.name,
        methodUsed: newTestGroup.method_used || '',
        specimen: newTestGroup.specimen || ''
      };
      
      return res.status(201).json(transformedNewGroup);

    case 'PUT':
      const { id, name: updateName, methodUsed: updateMethod, specimen: updateSpecimen } = req.body;
      const { data: updatedTestGroup, error: updateError } = await supabase
        .from('test_groups')
        .update({ 
          name: updateName, 
          method_used: updateMethod || '',
          specimen: updateSpecimen || ''
        })
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('id, name, method_used, specimen')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      
      const transformedUpdatedGroup = {
        id: updatedTestGroup.id,
        name: updatedTestGroup.name,
        methodUsed: updatedTestGroup.method_used || '',
        specimen: updatedTestGroup.specimen || ''
      };
      
      return res.status(200).json(transformedUpdatedGroup);

    case 'DELETE':
      const { id: deleteId } = req.body;
      const { error: deleteError } = await supabase
        .from('test_groups')
        .delete()
        .eq('id', deleteId)
        .eq('doctor_id', doctorId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
      return res.status(200).json({ message: 'Test group deleted' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
