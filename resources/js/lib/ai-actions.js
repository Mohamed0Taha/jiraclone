// Streaming helpers for Generative UI actions (AI SDK-like SSE protocol)
// Provides a drop-in client to create or update custom views via streaming events

import { getCsrfToken } from '@/utils/csrf';

// Small utility to build CSRF-aware headers without forcing Accept: application/json
function buildStreamHeaders(extra = {}) {
	const token = getCsrfToken();
	const headers = {
		'X-Requested-With': 'XMLHttpRequest',
		'Content-Type': 'application/json',
		// Request a text/plain stream of `data: ...` lines
		Accept: 'text/plain',
		...extra,
	};
	if (token) {
		headers['X-CSRF-TOKEN'] = token;
		headers['X-XSRF-TOKEN'] = token;
	}
	return headers;
}

// Generic SSE reader for AI SDK-like frames
export async function streamSSE(response, onEvent) {
	const reader = response.body?.getReader();
	if (!reader) throw new Error('Streaming not supported by this browser.');

	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		// Process complete lines
		const lines = buffer.split('\n');
		// Keep last partial line (if any) in buffer
		buffer = lines.pop() || '';

		for (const raw of lines) {
			const line = raw.trim();
			if (!line.startsWith('data: ')) continue;
			const dataStr = line.slice(6).trim();
			if (!dataStr) continue;
			if (dataStr === '[DONE]') {
				onEvent?.({ type: 'done' });
				continue;
			}
			try {
				const evt = JSON.parse(dataStr);
				onEvent?.(evt);
			} catch {
				// ignore non-JSON frames
			}
		}
	}
}

// High-level action: generate or update a custom view (SPA) with streaming events
// onEvent receives frames like: { type: 'status', stage, total, message } and { type: 'spa_generated', html, component_code, custom_view_id }
export async function streamCustomView({ projectId, viewName = 'default', message, conversationHistory = [], projectContext = null, currentComponentCode = null, signal = undefined, onEvent = () => {} }) {
	if (!projectId) throw new Error('projectId is required');
	if (!message || !message.trim()) throw new Error('message is required');

	const endpoint = `/projects/${projectId}/custom-views/chat`;
	const payload = {
		view_name: viewName,
		message,
		conversation_history: conversationHistory,
		project_context: projectContext,
		current_component_code: currentComponentCode,
	};

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: buildStreamHeaders(),
		credentials: 'include',
		body: JSON.stringify(payload),
		signal,
	});

	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('text/plain')) {
		// Fallback to JSON path for environments that don't stream
		if (!contentType.includes('application/json')) {
			throw new Error('Unexpected response type');
		}
		const data = await response.json();
		onEvent?.(data);
		return data;
	}

	await streamSSE(response, onEvent);
}

// Convenience wrappers
export async function generateCustomView(args) {
	return streamCustomView(args);
}

export async function updateCustomView(args) {
	return streamCustomView(args);
}

