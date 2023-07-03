import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  const isOpenAiKey = !token.startsWith(ACCESS_CODE_PREFIX);

  return {
    accessCode: isOpenAiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isOpenAiKey ? token : "",
  };
}

export function auth(req: NextRequest) {
  const authToken = req.headers.get("Authorization") ?? "";

  // check if it is openai api key or user token
  const { accessCode, apiKey: token } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  const serverConfig = getServerSideConfig();
  const { apiKeys, hasMutipleKeys, apiKey, codes, code } = serverConfig;

  console.log("[Auth] allowed hashed codes: ", [...codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  if (serverConfig.needCode && !serverConfig.codes.has(hashedCode) && !token) {
    return {
      error: true,
      msg: !accessCode ? "empty access code" : "wrong access code",
    };
  }

  const matchedKeyCode = apiKeys.find((match) => match.code === code);
  if (serverConfig.hasMutipleKeys && !matchedKeyCode && !token) {
    return {
      error: true,
      msg: !matchedKeyCode ? "empty access code" : "wrong access code",
    };
  }

  // if user does not provide an api key, inject system api key
  if (!token) {
    if (hasMutipleKeys) {
      // load the api key is matched with the access code
      console.log("[Auth] has multiple keys:");
      console.log("[Auth] use matched api key");

      // @ts-ignore matchedKeyCode is checked in line 51. Typescript is being retarded here.
      req.headers.set("Authorization", `Bearer ${matchedKeyCode.key}`);
    } else {
      if (apiKey) {
        console.log("[Auth] use system api key");
        req.headers.set("Authorization", `Bearer ${apiKey}`);
      } else {
        console.log("[Auth] admin did not provide an api key");
      }
    }
  } else {
    console.log("[Auth] use user api key");
  }

  return {
    error: false,
  };
}
