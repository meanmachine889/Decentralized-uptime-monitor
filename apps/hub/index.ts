import { randomUUIDv7, type ServerWebSocket } from "bun";
import type { IncomingMessage, SignUpIncomingMessage } from "../common/types";
import { prismaClient } from "db/client";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import nacl_util from "tweetnacl-util";

const validators: { validatorId: string, socket: ServerWebSocket<unknown>, pubKey: string }[] = [];
const callbacks: { [callbacks: string]: (data: IncomingMessage) => void } = {};
const cost = 100;

console.log(`[SERVER] Starting WebSocket server on port 8081...`);

Bun.serve({
    fetch(req, server) {
        if (server.upgrade(req)) {
            console.log(`[SERVER] Connection upgraded successfully`);
            return;
        }
        console.error(`[SERVER] Upgrade failed`);
        return new Response("Upgrade failed", { status: 500 });
    },
    port: 8081,
    websocket: {
        async message(ws: ServerWebSocket<unknown>, message: string) {
            console.log(`[WS] Incoming message: ${message}`);
            try {
                const data: IncomingMessage = JSON.parse(message);

                if (data.type === "signup") {
                    console.log(`[WS] Signup request received for publicKey: ${data.data.publicKey}`);
                    const ver = await verifyMsg(
                        `Signed message for ${data.data.callbackId}, ${data.data.publicKey}`,
                        data.data.publicKey,
                        data.data.signedMessage
                    );
                    if (ver) {
                        console.log(`[WS] Signature verified for publicKey: ${data.data.publicKey}`);
                        await signupHandler(ws, data.data);
                    } else {
                        console.warn(`[WS] Invalid signature for publicKey: ${data.data.publicKey}`);
                    }
                } else if (data.type === "validate") {
                    console.log(`[WS] Validation response received for callbackId: ${data.data.callbackId}`);
                    const callback = callbacks[data.data.callbackId];
                    if (callback) {
                        callback(data);
                        delete callbacks[data.data.callbackId];
                        console.log(`[WS] Callback executed and removed for callbackId: ${data.data.callbackId}`);
                    } else {
                        console.warn(`[WS] No callback found for callbackId: ${data.data.callbackId}`);
                    }
                }
            } catch (err) {
                console.error(`[WS] Error processing message:`, err);
            }
        },
        async close(ws: ServerWebSocket<unknown>) {
            const index = validators.findIndex(v => v.socket === ws);
            if (index !== -1) {
                console.log(`[WS] Validator ${validators[index]?.validatorId} disconnected`);
                validators.splice(index, 1);
            } else {
                console.warn(`[WS] Unknown socket disconnected`);
            }
        }
    }
});

async function signupHandler(
    ws: ServerWebSocket<unknown>,
    { ip, publicKey, signedMessage, callbackId }: SignUpIncomingMessage
) {
    console.log(`[SIGNUP] Handling signup for publicKey: ${publicKey}`);
    const vdb = await prismaClient.validator.findFirst({ where: { publicKey } });

    if (vdb) {
        console.log(`[SIGNUP] Existing validator found: ${vdb.id}`);
        ws.send(JSON.stringify({
            type: "signup",
            data: { validatorId: vdb.id, callbackId }
        }));
        validators.push({ validatorId: vdb.id, socket: ws, pubKey: vdb.publicKey });
        return;
    }

    console.log(`[SIGNUP] Creating new validator for publicKey: ${publicKey}`);
    const new_validator = await prismaClient.validator.create({
        data: { ip, publicKey, location: "unknown" },
    });

    ws.send(JSON.stringify({
        type: "signup",
        data: { validatorId: new_validator.id, callbackId }
    }));

    validators.push({ validatorId: new_validator.id, socket: ws, pubKey: new_validator.publicKey });
    console.log(`[SIGNUP] New validator created: ${new_validator.id}`);
}

async function verifyMsg(message: string, pubkey: string, signature: string) {
    try {
        const msgbytes = nacl_util.decodeUTF8(message);
        const res = nacl.sign.detached.verify(
            msgbytes,
            new Uint8Array(JSON.parse(signature)),
            new PublicKey(pubkey).toBytes()
        );
        return res;
    } catch (err) {
        console.error(`[VERIFY] Error verifying message for pubKey: ${pubkey}`, err);
        return false;
    }
}

setInterval(async () => {
    console.log(`[MONITOR] Fetching active websites to monitor...`);
    const websitesToMonitor = await prismaClient.website.findMany({ where: { disabled: false } });
    console.log(`[MONITOR] Found ${websitesToMonitor.length} active websites`);

    for (const web of websitesToMonitor) {
        validators.forEach(val => {
            const callbackId = randomUUIDv7();
            console.log(`[MONITOR] Sending validate msg to validator ${val.validatorId} for ${web.url}`);

            val.socket.send(JSON.stringify({
                type: "validate",
                data: { url: web.url, callbackId }
            }));

            callbacks[callbackId] = async (data: IncomingMessage) => {
                if (data.type === "validate") {
                    const { validatorId, status, latency, signedMessage } = data.data;
                    console.log(`[MONITOR] Validation reply from ${validatorId} for ${web.url} (latency: ${latency}ms)`);

                    const ver = await verifyMsg(`Replying to ${callbackId}`, val.pubKey, signedMessage);
                    if (!ver) {
                        console.warn(`[MONITOR] Invalid signature in validation reply from validator ${validatorId}`);
                        return;
                    }

                    try {
                        await prismaClient.$transaction(async (tx) => {
                            await tx.websiteTick.create({
                                data: { websiteId: web.id, validatorId, status, latency, createdAt: new Date() }
                            });
                            await tx.validator.update({
                                where: { id: validatorId },
                                data: { pendingPayouts: { increment: cost } }
                            });
                        });
                        console.log(`[MONITOR] Stored tick and updated payouts for validator ${validatorId}`);
                    } catch (err) {
                        console.error(`[MONITOR] DB transaction failed for validator ${validatorId}`, err);
                    }
                }
            };
        });
    }
}, 60 * 1000);
