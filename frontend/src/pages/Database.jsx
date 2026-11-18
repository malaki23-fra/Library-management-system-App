import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Database() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/database').then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1>Database</h1><p>Live, read-only view of the SQLite database used by this library.</p></div>
        {data && <span className="badge badge-info">{data.database}</span>}
      </div>
      {error && <div className="error-msg">{error}</div>}
      {!data && !error && <div className="card">Loading database…</div>}
      {data?.tables.map((table) => (
        <section className="card" key={table.name}>
          <h2>{table.name} <small className="text-muted">{table.total} records{table.total > table.rows.length ? ` · showing latest ${table.rows.length}` : ''}</small></h2>
          {table.rows.length === 0 ? <p className="text-muted">No records yet.</p> : (
            <div className="table-wrapper"><table>
              <thead><tr>{table.columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
              <tbody>{table.rows.map((row, index) => <tr key={row.id ?? index}>
                {table.columns.map((column) => <td key={column}>{row[column] ?? <span className="text-muted">—</span>}</td>)}
              </tr>)}</tbody>
            </table></div>
          )}
        </section>
      ))}
      <p className="text-muted">Password hashes are excluded from this view.</p>
    </div>
  );
}
