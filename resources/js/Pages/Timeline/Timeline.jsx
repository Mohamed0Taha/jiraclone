// resources/js/Pages/Timeline/Timeline.jsx
import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Timeline, {
    TimelineHeaders,
    SidebarHeader,
    DateHeader
} from 'react-calendar-timeline';
import 'react-calendar-timeline/dist/style.css';
import moment from 'moment';

export default function TimelinePage({ project = {}, tasks = {}, users = [] }) {
    // Flatten tasks to a single array
    const allTasks = [];
    if (tasks && typeof tasks === 'object') {
        ['todo', 'inprogress', 'review', 'done'].forEach((status) => {
            const arr = Array.isArray(tasks[status]) ? tasks[status] : [];
            arr.forEach((t) => allTasks.push({ ...t, status }));
        });
    }

    // Create groups (task status categories)
    const groups = [
        { id: 'todo', title: 'To Do', rightTitle: '' },
        { id: 'inprogress', title: 'In Progress', rightTitle: '' },
        { id: 'review', title: 'Review', rightTitle: '' },
        { id: 'done', title: 'Done', rightTitle: '' }
    ];

    // Map tasks to timeline items
    const items = allTasks.map((task, index) => {
        const startDate = task.start_date ? moment(task.start_date) : moment().startOf('day');
        const endDate = task.end_date ? moment(task.end_date) : startDate.clone().add(1, 'day');

        // Ensure end date is after start date
        const finalEndDate = endDate.isBefore(startDate) ? startDate.clone().add(1, 'day') : endDate;

        return {
            id: task.id || index,
            group: task.status || 'todo',
            title: task.title || 'Untitled Task',
            start_time: startDate.valueOf(),
            end_time: finalEndDate.valueOf(),
            canMove: true,
            canResize: true,
            canChangeGroup: true,
            itemProps: {
                style: {
                    backgroundColor: getStatusColor(task.status),
                    border: `1px solid ${getStatusBorderColor(task.status)}`,
                    borderRadius: '4px',
                    color: '#ffffff'
                }
            }
        };
    });

    // Helper functions for colors
    function getStatusColor(status) {
        switch (status) {
            case 'done': return '#10b981';
            case 'inprogress': return '#3b82f6';
            case 'review': return '#f59e0b';
            default: return '#6b7280';
        }
    }

    function getStatusBorderColor(status) {
        switch (status) {
            case 'done': return '#059669';
            case 'inprogress': return '#1d4ed8';
            case 'review': return '#d97706';
            default: return '#4b5563';
        }
    }

    // Timeline configuration
    const defaultTimeStart = moment().startOf('week').valueOf();
    const defaultTimeEnd = moment().endOf('week').add(1, 'week').valueOf();

    // Handle item move/resize
    const handleItemMove = (itemId, dragTime, newGroupOrder) => {
        console.log('Item moved:', { itemId, dragTime, newGroupOrder });
        // Here you could update the task in your backend
    };

    const handleItemResize = (itemId, time, edge) => {
        console.log('Item resized:', { itemId, time, edge });
        // Here you could update the task duration in your backend
    };

    return (
        <>
            <Head title={`${project?.name ?? 'Project'} — Timeline`} />

            <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
                {/* Header with back button */}
                <div style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <button
                        onClick={() => router.visit(route('tasks.index', project.id))}
                        style={{
                            background: 'none',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            color: '#374151'
                        }}
                    >
                        ← Back to Board
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                            {project?.name || 'Project Timeline'}
                        </h1>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                            {allTasks.length} tasks • Interactive Gantt Chart
                        </p>
                    </div>
                </div>

                {/* Main content */}
                <div style={{ padding: '16px' }}>
                    {allTasks.length > 0 ? (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            overflow: 'hidden',
                            height: '600px'
                        }}>
                            <Timeline
                                groups={groups}
                                items={items}
                                defaultTimeStart={defaultTimeStart}
                                defaultTimeEnd={defaultTimeEnd}
                                onItemMove={handleItemMove}
                                onItemResize={handleItemResize}
                                lineHeight={60}
                                itemHeightRatio={0.75}
                                canMove={true}
                                canResize="both"
                                canChangeGroup={true}
                                stackItems={true}
                                traditionalZoom={true}
                            >
                                <TimelineHeaders>
                                    <SidebarHeader>
                                        {({ getRootProps }) => (
                                            <div {...getRootProps()} style={{
                                                backgroundColor: '#f8fafc',
                                                borderBottom: '1px solid #e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '600',
                                                color: '#374151'
                                            }}>
                                                Status
                                            </div>
                                        )}
                                    </SidebarHeader>
                                    <DateHeader unit="primaryHeader" />
                                    <DateHeader />
                                </TimelineHeaders>
                            </Timeline>
                        </div>
                    ) : (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db',
                            padding: '48px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '18px' }}>
                                No tasks found
                            </h3>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                                Create some tasks in your project to view them on the timeline.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
