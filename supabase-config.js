// ============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS SUPABASE
// ============================================================
// Obtenha esses dados em: Supabase Dashboard > Project Settings > API

const SUPABASE_URL = "SUA_URL_DO_SUPABASE_AQUI";
const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_AQUI";

// Inicialização segura do cliente Supabase
let supabaseClient = null;

if (typeof supabase !== "undefined" && SUPABASE_URL !== "SUA_URL_DO_SUPABASE_AQUI") {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase conectado com sucesso!");
  } catch (err) {
    console.warn("Não foi possível conectar ao Supabase:", err);
  }
} else {
  console.info("Supabase ainda não configurado. O sistema usará localStorage como fallback.");
}
