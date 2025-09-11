import React, { useState, useEffect } from 'react';
import { csrfFetch } from '@/utils/csrf';

export default function ExpenseTracker({ project, auth }) {
    // State management
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '' });
    const [showForm, setShowForm] = useState(false);

    // Data operations
    const loadData = async () => {
        const saved = localStorage.getItem('expense-tracker-data');
        if (saved) {
            try {
                setExpenses(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
    };

    const saveData = (data) => {
        localStorage.setItem('expense-tracker-data', JSON.stringify(data));
    };

    const createExpense = async (expense) => {
        const newExpenseItem = {
            id: Date.now() + Math.random(),
            ...expense,
            amount: parseFloat(expense.amount),
            date: new Date().toISOString().split('T')[0],
            createdBy: auth?.user?.name || 'Unknown',
            createdAt: new Date().toISOString()
        };
        
        const updatedExpenses = [...expenses, newExpenseItem];
        setExpenses(updatedExpenses);
        saveData(updatedExpenses);
        setNewExpense({ description: '', amount: '', category: '' });
        setShowForm(false);
    };

    const updateExpense = async (id, updates) => {
        const updatedExpenses = expenses.map(exp => 
            exp.id === id ? { ...exp, ...updates } : exp
        );
        setExpenses(updatedExpenses);
        saveData(updatedExpenses);
    };

    const deleteExpense = async (id) => {
        const updatedExpenses = expenses.filter(exp => exp.id !== id);
        setExpenses(updatedExpenses);
        saveData(updatedExpenses);
    };

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categories = [...new Set(expenses.map(exp => exp.category))];

    return (
        <div className="expense-tracker-container h-full flex flex-col">
            {/* Compact Input Section (< 13% of space) */}
            <div className="input-section bg-gray-50 p-4 border-b" style={{maxHeight: '13vh'}}>
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Expense Tracker</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            Total: <span className="font-bold text-green-600">${totalExpenses.toFixed(2)}</span>
                        </span>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                        >
                            {showForm ? 'Cancel' : '+ Add Expense'}
                        </button>
                    </div>
                </div>
                
                {showForm && (
                    <div className="mt-3 flex gap-2 items-end">
                        <input
                            type="text"
                            placeholder="Description"
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <input
                            type="number"
                            placeholder="Amount"
                            value={newExpense.amount}
                            onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                            className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Category"
                            value={newExpense.category}
                            onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                            className="w-24 px-2 py-1 border rounded text-sm"
                        />
                        <button
                            onClick={() => createExpense(newExpense)}
                            disabled={!newExpense.description || !newExpense.amount}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
                        >
                            Add
                        </button>
                    </div>
                )}
            </div>
            
            {/* Main Data Display Area (> 87% of space) */}
            <div className="data-display-area flex-1 p-4 overflow-auto" style={{minHeight: '87vh'}}>
                {expenses.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <div className="text-4xl mb-4">💰</div>
                        <p>No expenses recorded yet.</p>
                        <p className="text-sm mt-2">Click "Add Expense" to get started!</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-600">Total Expenses</h3>
                                <p className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-600">Count</h3>
                                <p className="text-2xl font-bold text-blue-600">{expenses.length}</p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-600">Categories</h3>
                                <p className="text-2xl font-bold text-green-600">{categories.length}</p>
                            </div>
                        </div>

                        {/* Expenses Table */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {expense.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-medium text-red-600">
                                                    ${expense.amount.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {expense.date}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => deleteExpense(expense.id)}
                                                    className="text-red-600 hover:text-red-900 text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}