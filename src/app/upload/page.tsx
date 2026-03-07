'use client';

import { useState, useEffect } from 'react';

export default function UploadPage() {
    const [channelKey, setChannelKey] = useState('channelA');
    const [fileData, setFileData] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Metadata state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [chapters, setChapters] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        // Load last video generated
        const saved = localStorage.getItem('last_video_path');
        if (saved) {
            setFileData(JSON.parse(saved));
        }
    }, []);

    const handleGenerateMetadata = async () => {
        const topic = globalThis.prompt("What is this video about? (topic)", "A futuristic city");
        if (!topic) return;

        setIsGenerating(true);
        try {
            const res = await fetch('/api/ollama/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });
            const data = await res.json();

            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.tags) setTags(Array.isArray(data.tags) ? data.tags.join(', ') : data.tags);
            if (data.chapters) setChapters(data.chapters);
        } catch (err) {
            console.error(err);
            alert('Failed to generate metadata');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpload = async () => {
        if (!fileData && !selectedFile) {
            alert("No file selected.");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('channelKey', channelKey);
            formData.append('title', title);
            formData.append('description', description + '\n\n' + chapters);
            const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
            formData.append('tags', JSON.stringify(tagsArray));

            if (selectedFile) {
                formData.append('file', selectedFile);
            } else if (fileData?.url || fileData?.filename) {
                // Fetch the ComfyUI generated file back to this browser to upload to our backend
                // Use the proxy route we created to avoid CORS!
                const proxyUrl = fileData.filename
                    ? `/api/comfy/view?filename=${fileData.filename}&subfolder=${fileData.subfolder || ''}&type=${fileData.type || 'output'}`
                    : fileData.url; // Fallback just in case

                const fileRes = await fetch(proxyUrl);
                const blob = await fileRes.blob();
                formData.append('file', blob, fileData.filename || 'generated_video.mp4');
            }

            const reqRes = await fetch('/api/youtube/upload', {
                method: 'POST',
                body: formData,
            });

            const reqData = await reqRes.json();
            if (reqData.success) {
                setUploadSuccess(true);
            } else {
                alert("Upload failed: " + (reqData.error || reqData.details));
            }
        } catch (err) {
            console.error(err);
            alert('Error during upload. Check console.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAuth = () => {
        window.location.href = `/api/youtube/oauth/start?channelKey=${channelKey}`;
    };

    return (
        <div className="p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">Upload Video</h1>

                <div className="bg-gray-800 p-6 rounded-2xl shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-700 pb-6 gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Target Channel</label>
                            <select
                                value={channelKey} onChange={e => setChannelKey(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                            >
                                <option value="channelA">Channel A</option>
                                <option value="channelB">Channel B</option>
                            </select>
                        </div>
                        <div className="sm:pt-6">
                            <button
                                onClick={handleAuth}
                                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                            >
                                Login to YouTube (OAuth)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Video File</label>
                        {fileData && !selectedFile && (
                            <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 font-mono text-sm text-green-300 truncate mb-2">
                                Loaded from ComfyUI: {fileData.filename}
                            </div>
                        )}
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-900 file:text-indigo-200 hover:file:bg-indigo-800 transition block w-full border border-gray-700 bg-gray-900 rounded-lg cursor-pointer"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-700 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">Metadata</h3>
                            <button
                                onClick={handleGenerateMetadata}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                            >
                                {isGenerating ? 'Generating...' : '✨ Auto-Generate Outline'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                                <input
                                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                <textarea
                                    value={description} onChange={e => setDescription(e.target.value)} rows={4}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma separated)</label>
                                <input
                                    type="text" value={tags} onChange={e => setTags(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Chapters</label>
                                <textarea
                                    value={chapters} onChange={e => setChapters(e.target.value)} rows={3}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleUpload}
                            disabled={isUploading || (!fileData && !selectedFile)}
                            className="w-full py-4 px-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-lg font-bold rounded-xl shadow-xl transform transition active:scale-95 disabled:opacity-50"
                        >
                            {isUploading ? 'Uploading to YouTube...' : 'Upload to YouTube'}
                        </button>

                        {uploadSuccess && (
                            <div className="mt-4 p-4 bg-green-900/50 border border-green-500 text-green-300 rounded-lg text-center font-medium">
                                Upload successful! The video is now processing on YouTube.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
