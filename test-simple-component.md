Test simple component - should work without any DataGrid issues:

```jsx
import React, { useState } from 'react';

export default function SimpleTest() {
    const [count, setCount] = useState(0);
    
    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
            <h2>Simple Test Component</h2>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Increment
            </button>
            <p>This component tests that the React rendering system works correctly.</p>
        </div>
    );
}
```

If this renders correctly, then we can test DataGrid next.