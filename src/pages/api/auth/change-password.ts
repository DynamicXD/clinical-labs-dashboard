import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { currentPassword, newPassword } = req.body;
  const doctorId = req.headers.authorization;

  if (!doctorId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    // Get current doctor's password hash from database
    const { data: doctor, error: fetchError } = await supabase
      .from('doctors')
      .select('password')
      .eq('id', doctorId)
      .single();

    if (fetchError || !doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, doctor.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const { error: updateError } = await supabase
      .from('doctors')
      .update({ password: hashedNewPassword })
      .eq('id', doctorId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    return res.status(200).json({ 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
