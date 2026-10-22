function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}; see README (npm run env)`);
  return value;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL"),
  publishableKey: () => required("SUPABASE_PUBLISHABLE_KEY"),
  secretKey: () => required("SUPABASE_SECRET_KEY"),
};
