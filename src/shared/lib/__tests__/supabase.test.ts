import { supabase } from '../supabase';

describe('Supabase Client', () => {
  it('doit être instancié correctement', () => {
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(supabase.storage).toBeDefined();
  });

  it('doit posséder les méthodes d’interaction de base de données', () => {
    const tableQuery = supabase.from('profiles');
    expect(tableQuery.select).toBeDefined();
    expect(tableQuery.insert).toBeDefined();
    expect(tableQuery.update).toBeDefined();
    expect(tableQuery.delete).toBeDefined();
  });
});
