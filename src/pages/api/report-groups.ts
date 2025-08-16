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
      const { data: reportGroups, error: fetchError } = await supabase
        .from('report_groups')
        .select('id, name, test_groups')
        .eq('doctor_id', doctorId)
        .order('name');

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }
      
      // Transform data to match frontend interface
      const transformedData = reportGroups.map(group => ({
        id: group.id,
        name: group.name,
        testGroups: group.test_groups || []
      }));
      
      return res.status(200).json(transformedData);

    case 'POST':
      const { name, testGroups } = req.body;
      const { data: newReportGroup, error: insertError } = await supabase
        .from('report_groups')
        .insert([{ 
          doctor_id: doctorId, 
          name, 
          test_groups: testGroups || []
        }])
        .select('id, name, test_groups')
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      
      const transformedNewGroup = {
        id: newReportGroup.id,
        name: newReportGroup.name,
        testGroups: newReportGroup.test_groups || []
      };
      
      return res.status(201).json(transformedNewGroup);

    case 'PUT':
      const { id, name: updateName, testGroups: updateTestGroups } = req.body;
      const { data: updatedReportGroup, error: updateError } = await supabase
        .from('report_groups')
        .update({ 
          name: updateName, 
          test_groups: updateTestGroups || []
        })
        .eq('id', id)
        .eq('doctor_id', doctorId)
        .select('id, name, test_groups')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      
      const transformedUpdatedGroup = {
        id: updatedReportGroup.id,
        name: updatedReportGroup.name,
        testGroups: updatedReportGroup.test_groups || []
      };
      
      return res.status(200).json(transformedUpdatedGroup);

    case 'DELETE':
      const { id: deleteId } = req.body;
      const { error: deleteError } = await supabase
        .from('report_groups')
        .delete()
        .eq('id', deleteId)
        .eq('doctor_id', doctorId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
      return res.status(200).json({ message: 'Report group deleted' });

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
