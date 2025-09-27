import { randomUUIDv7 } from "bun";
import type { OutgoingMessage, SignupOutgoingMessage, ValidateOutgoingMessage } from "../common/types";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import nacl_util from "tweetnacl-util";
import bs58 from "bs58"

const CALLBACKS: { [callbackId: string]: (data: SignupOutgoingMessage) => void } = {}

let validatorId: string | null = null;

async function main() {
    const kp = Keypair.fromSecretKey(
        bs58.decode(process.env.VALIDATOR_SECRET_KEY!)
    );

    console.log(`[CLIENT] Connecting to WebSocket server...`);
    const ws = new WebSocket("ws://localhost:8081");

    ws.onopen = async () => {
        console.log(`[CLIENT] Connected to server`);
        const callbackId = randomUUIDv7();
        CALLBACKS[callbackId] = (data: SignupOutgoingMessage) => {
            validatorId = data.validatorId;
            console.log(`[SIGNUP] Successfully signed up as validator: ${validatorId}`);
        };
        const signedMessage = await signMessage(
            `Signed message for ${callbackId}, ${kp.publicKey}`,
            kp
        );
        console.log(`[SIGNUP] Sending signup request with publicKey: ${kp.publicKey.toBase58()}`);
        ws.send(JSON.stringify({
            type: "signup",
            data: {
                callbackId,
                ip: "127.0.0.1",
                publicKey: kp.publicKey,
                signedMessage
            }
        }));
    };

    ws.onmessage = async (event) => {
        try {
            const data: OutgoingMessage = JSON.parse(event.data);
            console.log(`[WS] Incoming message of type: ${data.type}`);

            if (data.type === "signup") {
                CALLBACKS[data.data.callbackId]?.(data.data);
                delete CALLBACKS[data.data.callbackId];
            } else if (data.type === "validate") {
                console.log(`[VALIDATE] Received validation request for URL: ${data.data.url}`);
                await validateHandler(ws, data.data, kp);
            } else {
                console.warn(`[WS] Unknown message`);
            }
        } catch (err) {
            console.error(`[WS] Failed to process incoming message:`, err);
        }
    };

    ws.onclose = () => {
        console.warn(`[CLIENT] Disconnected from server`);
    };

    ws.onerror = (err) => {
        console.error(`[CLIENT] WebSocket error:`, err);
    };
}

async function validateHandler(
    ws: WebSocket,
    { url, callbackId, websiteId }: ValidateOutgoingMessage,
    kp: Keypair
) {
    console.log(`[VALIDATE] Starting validation for ${url}`);
    const st = Date.now();
    const signature = await signMessage(`Replying to ${callbackId}`, kp);

    try {
        const res = await fetch(url);
        const ent = Date.now();
        const lag = ent - st;
        const status = res.status;
        console.log(`[VALIDATE] Fetched ${url} | Status: ${status} | Latency: ${lag}ms`);

        ws.send(JSON.stringify({
            type: "validate",
            data: {
                callbackId,
                status: status === 200 ? "Good" : "Bad",
                latency: lag,
                websiteId,
                validatorId,
                signedMessage: signature
            }
        }));
        console.log(`[VALIDATE] Sent validation result for ${url}`);
    } catch (error) {
        console.error(`[VALIDATE] Error fetching ${url}:`, error);
        ws.send(JSON.stringify({
            type: "validate",
            data: {
                callbackId,
                status: "Bad",
                latency: 1000,
                websiteId,
                validatorId,
                signedMessage: signature
            }
        }));
    }
}

async function signMessage(message: string, kp: Keypair) {
    const messBytes = nacl_util.decodeUTF8(message);
    const signature = nacl.sign.detached(messBytes, kp.secretKey);
    return JSON.stringify(Array.from(signature));
}

main();

setInterval(async () => {
    if (validatorId) {
        console.log(`[HEARTBEAT] Validator ${validatorId} is active`);
    } else {
        console.log(`[HEARTBEAT] Validator not yet registered`);
    }
}, 10000);
