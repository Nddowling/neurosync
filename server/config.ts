import type {AuthConfig} from './auth/router.js';
export function authConfig(environment:NodeJS.ProcessEnv):AuthConfig {
 const mode=environment.AUTH_MODE;
 if(mode!=='local'&&mode!=='oidc'&&mode!=='supabase')throw new Error('AUTH_MODE is required');
 return {mode,environment:environment.NODE_ENV??'production',origin:environment.APP_ORIGIN??'',
 ...(environment.OIDC_ISSUER?{issuer:environment.OIDC_ISSUER}:{}),
 ...(environment.OIDC_CLIENT_ID?{clientId:environment.OIDC_CLIENT_ID}:{}),
 ...(environment.OIDC_CLIENT_SECRET?{clientSecret:environment.OIDC_CLIENT_SECRET}:{}),
 ...(environment.SUPABASE_URL?{supabaseUrl:environment.SUPABASE_URL}:{}),
 ...(environment.SUPABASE_PUBLISHABLE_KEY?{supabaseKey:environment.SUPABASE_PUBLISHABLE_KEY}:{})};
}
