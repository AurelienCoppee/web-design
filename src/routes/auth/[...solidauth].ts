import { SolidAuth, type SolidAuthConfig } from "@auth/solid-start";
import { authOptions } from "~/server/auth";

export const { GET, POST } = SolidAuth(authOptions as SolidAuthConfig);
