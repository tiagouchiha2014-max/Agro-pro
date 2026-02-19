/* 
   AGRO PRO — supabase-client.js
   Integração oficial com o Supabase para Autenticação e Banco de Dados
*/

// IMPORTANTE: Estas chaves serão configuradas via Variáveis de Ambiente no Deploy
// Para testes locais, o usuário deve preencher no console ou via Configurações
const SUPABASE_URL = "https://ledetrfcsxlkgaipixrx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Km_z6xCWKJHtvR79rse-iA_vWtz2b91";

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const AuthService = {
    async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        return { data, error };
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    async getUserProfile() {
        const session = await this.getSession();
        if (!session) return null;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
        return data;
    }
};

const DatabaseService = {
    // FAZENDAS
    async getFazendas() {
        const { data, error } = await supabase.from('fazendas').select('*');
        return data;
    },
    async addFazenda(fazenda) {
        const { data, error } = await supabase.from('fazendas').insert([fazenda]).select();
        return { data, error };
    },

    // TALHÕES
    async getTalhoes(fazendaId) {
        let query = supabase.from('talhoes').select('*');
        if (fazendaId) query = query.eq('fazenda_id', fazendaId);
        const { data, error } = await query;
        return data;
    },
    async addTalhao(talhao) {
        const { data, error } = await supabase.from('talhoes').insert([talhao]).select();
        return { data, error };
    },

    // ESTOQUE
    async getEstoque() {
        const { data, error } = await supabase.from('estoque').select('*');
        return data;
    },

    // APLICAÇÕES
    async getAplicacoes(talhaoId) {
        const { data, error } = await supabase.from('aplicacoes').select('*').eq('talhao_id', talhaoId);
        return data;
    }
};
