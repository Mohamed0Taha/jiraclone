import React from 'react';
import { Head } from '@inertiajs/react';

export default function ProjectShow({ project }) {
    return (
        <>
            <Head title={project.name} />
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
                <p className="text-gray-700">{project.description}</p>
            </div>
        </>
    );
}
