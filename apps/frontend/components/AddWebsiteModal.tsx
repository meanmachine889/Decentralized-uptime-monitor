"use client";

import { X } from "lucide-react"
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import axios from "axios";
import { API_BACKEND_URL } from "@/config";
import { UseWebsites } from "@/hook/useWebsites";
import { toast } from "react-hot-toast";

type AddWebsiteModalProps = {
    setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
    RefreshWebsite: () => Promise<void>;
};

export default function AddWebsiteModal({
    RefreshWebsite,
    setShowAddModal,
}: AddWebsiteModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
    const { getToken } = useAuth();

    const handleAddWebsite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWebsiteUrl.trim()) return;

        setIsSubmitting(true);
        try {
            const token = await getToken();
            await axios.post(`${API_BACKEND_URL}/api/v1/websites`, {
                url: newWebsiteUrl
            }, {
                headers: {
                    Authorization: token,
                }
            }).then(() => {
                RefreshWebsite();
            })
            setNewWebsiteUrl('');
            setShowAddModal(false);
            toast.success("Website added successfully!");
        } catch (error) {
            console.error('Failed to add website:', error);
            toast.error("Failed to add website. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-normal text-white">Add Website</h2>
                    <button
                        onClick={() => setShowAddModal(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleAddWebsite}>
                    <div className="mb-4">
                        <label htmlFor="url" className="block text-sm text-gray-300 mb-2">
                            Website URL
                        </label>
                        <input
                            type="url"
                            id="url"
                            value={newWebsiteUrl}
                            onChange={(e) => setNewWebsiteUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !newWebsiteUrl.trim()}
                            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Website'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}