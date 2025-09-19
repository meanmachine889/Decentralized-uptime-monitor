"use client";

import { API_BACKEND_URL } from "@/config";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { STRING_LITERAL_DROP_BUNDLE } from "next/dist/shared/lib/constants";
import { useEffect, useState } from "react";

export interface Ticks {
    id: string;
    createdAt: string;
    status: string;
    latency: number;
}

export interface Website {
    id: string;
    url: string;
    ticks: Ticks[];
}

export function UseWebsites() {
    const { getToken } = useAuth();
    const [websites, setWebites] = useState<Website[]>([])
    async function RefreshWebsite() {
        const auth = await getToken();
        const res = await axios.get(`${API_BACKEND_URL}/api/v1/websites`, {
            headers: {
                Authorization: auth,
            }
        })
        setWebites(res.data.data);
    }
    useEffect(() => {
        RefreshWebsite();
        const interval = setInterval(() => {
            RefreshWebsite();
        }, 1000 * 60 * 1);
        return () => clearInterval(interval);
    }, []);

    return {websites, RefreshWebsite};
}