import md5 from "spark-md5";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY?: string;
      CODE?: string;
      BASE_URL?: string;
      PROXY_URL?: string;
      VERCEL?: string;
      HIDE_USER_API_KEY?: string; // disable user's api key input
      DISABLE_GPT4?: string; // allow user to use gpt-4 or not
      BUILD_MODE?: "standalone" | "export";
      BUILD_APP?: string; // is building desktop app
      HIDE_BALANCE_QUERY?: string; // allow user to query balance or not
    }
  }
}

const ACCESS_CODES = (function getAccessCodes(): Set<string> {
  const code = process.env.CODE;

  try {
    const codes = (code?.split(",") ?? [])
      .filter((v) => !!v)
      .map((v) => md5.hash(v.trim()));
    return new Set(codes);
  } catch (e) {
    return new Set();
  }
})();

const OPENAI_API_KEY_MATCHES = (function getAccessCodes(): Array<{
  key: string;
  code: string;
}> {
  const code = process.env.code;
  const key = process.env.OPENAI_API_KEY;

  try {
    const codes = (code?.split(",") ?? [])
      .filter((v) => !!v)
      .map((v) => md5.hash(v.trim()));
    const keys = (code?.split(",") ?? [])
      .filter((v) => !!v)
      .map((v) => md5.hash(v.trim()));

    if (
      keys.length === 0 &&
      codes.length === 0 &&
      keys.length !== codes.length
    ) {
      throw Error(
        "[Server Config] Codes and keys are mismatched. Please check your code and key.",
      );
    }

    return codes.map((code) => ({
      code,
      key: keys[codes.indexOf(code)],
    }));
  } catch (e) {
    return [];
  }
})();

export const getServerSideConfig = () => {
  if (typeof process === "undefined") {
    throw Error(
      "[Server Config] you are importing a nodejs-only module outside of nodejs",
    );
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    apiKeys: OPENAI_API_KEY_MATCHES,
    hasMutipleKeys: OPENAI_API_KEY_MATCHES.length > 0,
    code: process.env.CODE,
    codes: ACCESS_CODES,
    needCode: ACCESS_CODES.size > 0,
    baseUrl: process.env.BASE_URL,
    proxyUrl: process.env.PROXY_URL,
    isVercel: !!process.env.VERCEL,
    hideUserApiKey: !!process.env.HIDE_USER_API_KEY,
    enableGPT4: !process.env.DISABLE_GPT4,
    hideBalanceQuery: !!process.env.HIDE_BALANCE_QUERY,
  };
};
