import React, { useState } from 'react';
import { useForm, Head } from '@inertiajs/react';

export default function ProjectsIndex({ projects }) {
    const [showForm, setShowForm] = useState(projects.length === 0);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/projects');
    };

    return (
        <>
            <Head title="My Projects" />
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Your Projects</h1>

                {projects.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-lg mb-4">You have no projects yet.</p>
                        {!showForm && (
                            <button
                                className="bg-blue-600 text-white px-6 py-3 rounded"
                                onClick={() => setShowForm(true)}
                            >
                                Create Your First Project
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {projects.map((project) => (
                            <li key={project.id}>
                                <a
                                    href={`/projects/${project.id}`}
                                    className="text-lg text-blue-700 hover:underline"
                                >
                                    {project.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}

                {showForm && (
                    <form onSubmit={submit} className="mt-8 space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Project Name</label>
                            <input
                                type="text"
                                className="w-full border rounded p-2"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Description</label>
                            <textarea
                                className="w-full border rounded p-2"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                            {errors.description && (
                                <p className="text-red-600 text-sm">{errors.description}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
                            disabled={processing}
                        >
                            Create Project
                        </button>
                    </form>
                )}
            </div>
        </>
    );
}
