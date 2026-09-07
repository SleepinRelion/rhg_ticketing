import db from '../config/database.js';
import bcrypt from 'bcryptjs';

export function checkPasswordComplexity(password) {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8');
  const requireUppercase = process.env.PASSWORD_REQUIRE_UPPERCASE === 'true';
  const requireLowercase = process.env.PASSWORD_REQUIRE_LOWERCASE === 'true';
  const requireNumbers = process.env.PASSWORD_REQUIRE_NUMBERS === 'true';
  const requireSymbols = process.env.PASSWORD_REQUIRE_SYMBOLS === 'true';

  if (password.length < minLength) return `Password must be at least ${minLength} characters long.`;
  if (requireUppercase && !/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (requireLowercase && !/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (requireNumbers && !/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (requireSymbols && !/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one symbol.';

  return null; // Valid
}

export async function checkPasswordHistory(userId, newPassword) {
  const historyCount = parseInt(process.env.PASSWORD_HISTORY_COUNT || '0');
  if (historyCount <= 0) return true; // History check disabled

  const history = await db('password_history')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(historyCount);

  for (const entry of history) {
    const isMatch = await bcrypt.compare(newPassword, entry.password_hash);
    if (isMatch) return false; // Password has been used recently
  }
  return true;
}

export async function updatePasswordHistory(userId, newPasswordHash) {
  const historyCount = parseInt(process.env.PASSWORD_HISTORY_COUNT || '0');
  
  // Even if historyCount is 0, we might still insert it just in case they enable it later, 
  // but to save space we'll only insert if history is enabled.
  if (historyCount > 0) {
    await db('password_history').insert({
      user_id: userId,
      password_hash: newPasswordHash,
      created_at: new Date()
    });

    // Cleanup old history
    const historyToKeep = await db('password_history')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(historyCount)
      .select('id');
      
    if (historyToKeep.length > 0) {
      const idsToKeep = historyToKeep.map(h => h.id);
      await db('password_history')
        .where({ user_id: userId })
        .whereNotIn('id', idsToKeep)
        .del();
    }
  }
}
