/* =====================================================================
   Configuration Supabase — a remplir UNE SEULE FOIS.

   1. Cree un compte gratuit sur https://supabase.com (aucune carte
      bancaire demandee), puis un nouveau projet.
   2. Dans le projet : Project Settings > API.
      - copie "Project URL"          -> colle-le dans SUPABASE_URL
      - copie "anon public" (la cle) -> colle-le dans SUPABASE_ANON_KEY
   3. Toujours dans le projet : SQL Editor > New query, colle le contenu
      du fichier sql/schema.sql, clique Run.

   La cle "anon public" n'est PAS un secret : elle est concue pour vivre
   dans du code cote client (comme ici). C'est la securite au niveau des
   lignes (RLS), definie dans sql/schema.sql, qui protege les donnees —
   jamais cette cle. Ne mets JAMAIS la cle "service_role" ici.
   ===================================================================== */
window.SUPABASE_URL = 'https://VOTRE-PROJET.supabase.co';
window.SUPABASE_ANON_KEY = 'VOTRE-CLE-ANON-PUBLIC';
