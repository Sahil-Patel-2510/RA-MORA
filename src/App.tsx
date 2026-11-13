import { useEffect, useMemo, useState, type FormEvent, type CSSProperties } from 'react'
import AdminLogin from './AdminLogin'
import './App.css'

const API_URL = "https://backend.psahil25103.workers.dev";

interface Enquiry {
  id: number
  name: string
  email: string
  phone: string
  service: string
  message: string
  created_at: string
}

type AdminTab = 'dashboard' | 'enquiries'

const services = [
  { icon: '🌐', title: 'Web Development', desc: 'Modern, responsive and powerful websites for your business.' },
  { icon: '📱', title: 'Mobile Applications', desc: 'Smart mobile experiences designed around your customers.' },
  { icon: '⚙️', title: 'Software Solutions', desc: 'Custom software to simplify and grow your business.' },
  { icon: '🤖', title: 'AI & Machine Learning', desc: 'Intelligent technology that transforms business operations.' },
  { icon: '🔄', title: 'Business Automation', desc: 'Automate repetitive tasks and improve productivity.' },
  { icon: '📈', title: 'Digital Marketing', desc: 'Build your brand and reach the right audience.' },
]

const panelStyle: CSSProperties = {
  background: '#111a2d',
  border: '1px solid #26334c',
  borderRadius: 16,
  padding: 22,
}

const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: '10px 15px',
  cursor: 'pointer',
  fontWeight: 700,
}

function App() {
  const [formStatus, setFormStatus] = useState('')
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loadingEnquiries, setLoadingEnquiries] = useState(false)
  const [enquiryError, setEnquiryError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceFilter, setServiceFilter] = useState('All')
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdminPage = window.location.pathname.replace(/\/+$/, '') === '/admin'

  useEffect(() => {
    if (!isAdminPage) {
      setCheckingAdmin(false)
      return
    }

    let cancelled = false

    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/api/admin/me`, {
          credentials: 'include',
        })
        const data = await response.json()

        if (!cancelled) {
          setAdminAuthenticated(response.ok && data.authenticated === true)
        }
      } catch {
        if (!cancelled) setAdminAuthenticated(false)
      } finally {
        if (!cancelled) setCheckingAdmin(false)
      }
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [isAdminPage])

  async function loadEnquiries() {
    setLoadingEnquiries(true)
    setEnquiryError('')

    try {
      const response = await fetch(`${API_URL}/api/admin/enquiries`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load enquiries.')
      }

      const rows = Array.isArray(data.enquiries)
        ? data.enquiries
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.results)
            ? data.results
            : []

      setEnquiries(rows)
    } catch (error) {
      setEnquiryError(
        error instanceof Error
          ? error.message
          : 'Unable to load customer enquiries.'
      )
    } finally {
      setLoadingEnquiries(false)
    }
  }

  useEffect(() => {
    if (isAdminPage && adminAuthenticated) {
      void loadEnquiries()
    }
  }, [isAdminPage, adminAuthenticated])

  async function deleteEnquiry(id: number) {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this enquiry?'
    )

    if (!confirmed) return

    setDeletingId(id)

    try {
      const response = await fetch(
        `${API_URL}/api/admin/enquiries/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete enquiry.')
      }

      setEnquiries((previous) =>
        previous.filter((item) => item.id !== id)
      )

      setSelectedEnquiry((current) =>
        current?.id === id ? null : current
      )
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to delete enquiry.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Logout failed.')
      }

      setAdminAuthenticated(false)
      setEnquiries([])
      setSelectedEnquiry(null)
      setActiveTab('dashboard')
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Logout failed.'
      )
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    const enquiry = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      service: formData.get('service'),
      message: formData.get('message'),
    }

    setFormStatus('Sending your enquiry...')

    try {
      const response = await fetch(`${API_URL}/api/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiry),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit enquiry.')
      }

      setFormStatus(
        'Thank you! Your enquiry has been submitted successfully.'
      )

      form.reset()
    } catch (error) {
      setFormStatus(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      )
    }
  }

  const todayCount = useMemo(() => {
    const today = new Date().toDateString()

    return enquiries.filter(
      (item) =>
        item.created_at &&
        new Date(item.created_at).toDateString() === today
    ).length
  }, [enquiries])

  const filteredEnquiries = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return enquiries.filter((item) => {
      const matchesSearch =
        !search ||
        [
          item.name,
          item.email,
          item.phone,
          item.message,
        ].some((value) =>
          String(value || '').toLowerCase().includes(search)
        )

      const matchesService =
        serviceFilter === 'All' ||
        item.service === serviceFilter

      return matchesSearch && matchesService
    })
  }, [enquiries, searchTerm, serviceFilter])

  // ADMIN PANEL

  if (isAdminPage) {
    if (checkingAdmin) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#080d19',
          color: '#e8edf8',
          fontFamily: 'Arial, sans-serif',
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>RA–MORA</h2>
            <p>Checking secure admin session...</p>
          </div>
        </div>
      )
    }

    if (!adminAuthenticated) {
      return (
        <AdminLogin
          onLogin={() => setAdminAuthenticated(true)}
        />
      )
    }

    const navButton = (
      tab: AdminTab,
      label: string,
      icon: string
    ) => (
      <button
        key={tab}
        onClick={() => {
          setActiveTab(tab)
          setMobileMenuOpen(false)
        }}
        style={{
          ...buttonStyle,
          width: '100%',
          textAlign: 'left',
          color: activeTab === tab ? '#fff' : '#9ba9c2',
          background: activeTab === tab
            ? '#273a5c'
            : 'transparent',
          marginBottom: 7,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span>{icon}</span>
        {label}
      </button>
    )

    const thStyle: CSSProperties = {
      padding: '14px 13px',
      textAlign: 'left',
      color: '#aebbd1',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      borderBottom: '1px solid #2b3851',
      whiteSpace: 'nowrap',
    }

    const tdStyle: CSSProperties = {
      padding: '14px 13px',
      borderBottom: '1px solid #202d43',
      color: '#e5ebf5',
      fontSize: 13,
      verticalAlign: 'top',
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: '#080d19',
        color: '#edf2fb',
        fontFamily: 'Inter, Arial, sans-serif',
      }}>
        <style>{`
          * { box-sizing: border-box; }
          .admin-layout { display: flex; min-height: 100vh; }
          .admin-sidebar {
            width: 245px;
            flex: 0 0 245px;
            background: #0d1525;
            border-right: 1px solid #202d43;
            padding: 25px 17px;
            display: flex;
            flex-direction: column;
          }
          .admin-main {
            min-width: 0;
            flex: 1;
            padding: 30px;
          }
          .admin-cards {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            margin: 24px 0;
          }
          .admin-table-wrap { overflow-x: auto; }
          .admin-mobile-bar { display: none; }
          .admin-input {
            width: 100%;
            min-width: 0;
            background: #0b1424;
            color: #eef3fb;
            border: 1px solid #2b3952;
            border-radius: 9px;
            padding: 12px 14px;
            outline: none;
          }
          .admin-input:focus { border-color: #91a9d6; }

          @media (max-width: 850px) {
            .admin-sidebar {
              width: 215px;
              flex-basis: 215px;
            }
            .admin-main { padding: 22px; }
          }

          @media (max-width: 650px) {
            .admin-layout { display: block; }
            .admin-mobile-bar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 16px 18px;
              background: #0d1525;
              border-bottom: 1px solid #202d43;
            }
            .admin-sidebar {
              display: none;
              width: 100%;
              border-right: 0;
              border-bottom: 1px solid #202d43;
              padding: 16px;
            }
            .admin-sidebar.open { display: flex; }
            .admin-main { padding: 18px 14px; }
            .admin-cards {
              grid-template-columns: 1fr;
              gap: 12px;
            }
            .admin-heading { font-size: 24px !important; }
          }
        `}</style>

        <div className="admin-mobile-bar">
          <strong>RA–MORA ADMIN</strong>

          <button
            onClick={() =>
              setMobileMenuOpen((open) => !open)
            }
            style={{
              ...buttonStyle,
              background: '#263a5d',
              color: 'white',
            }}
          >
            {mobileMenuOpen ? 'Close ✕' : 'Menu ☰'}
          </button>
        </div>

        <div className="admin-layout">
          <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
            <div style={{ padding: '4px 12px 30px' }}>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 1.2,
              }}>
                RA–MORA
              </div>

              <div style={{
                color: '#7f91ad',
                fontSize: 10,
                letterSpacing: 2,
                marginTop: 5,
              }}>
                TECHNOLOGIES
              </div>

              <div style={{
                color: '#71829d',
                fontSize: 11,
                marginTop: 22,
              }}>
                ADMINISTRATION
              </div>
            </div>

            <div style={{
              color: '#73839d',
              fontSize: 10,
              letterSpacing: 1.5,
              padding: '0 12px 10px',
            }}>
              WORKSPACE
            </div>

            {navButton('dashboard', 'Dashboard', '▦')}
            {navButton('enquiries', 'Customer Enquiries', '✉')}

            <div style={{
              marginTop: 'auto',
              padding: '20px 10px 0',
              borderTop: '1px solid #26334a',
            }}>
              <div style={{
                color: '#9ba9c2',
                fontSize: 12,
                marginBottom: 12,
              }}>
                Signed in as <strong style={{ color: '#fff' }}>Admin</strong>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  color: '#ffb4b4',
                  background: '#3a202c',
                  textAlign: 'left',
                }}
              >
                ↪ Logout
              </button>
            </div>
          </aside>

          <section className="admin-main">
            <header style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 15,
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{
                  color: '#8fa4c4',
                  fontSize: 11,
                  letterSpacing: 1.7,
                  margin: '0 0 8px',
                }}>
                  RA–MORA TECHNOLOGIES / ADMIN
                </p>

                <h1
                  className="admin-heading"
                  style={{ fontSize: 30, margin: 0 }}
                >
                  {activeTab === 'dashboard'
                    ? 'Dashboard overview'
                    : 'Customer enquiries'}
                </h1>

                <p style={{
                  color: '#8c9bb4',
                  margin: '9px 0 0',
                  fontSize: 13,
                }}>
                  {activeTab === 'dashboard'
                    ? 'Monitor your website enquiries and activity.'
                    : 'Review and manage customer messages.'}
                </p>
              </div>

              <button
                onClick={() => void loadEnquiries()}
                disabled={loadingEnquiries}
                style={{
                  ...buttonStyle,
                  color: '#fff',
                  background: '#314c76',
                  opacity: loadingEnquiries ? 0.65 : 1,
                }}
              >
                {loadingEnquiries ? 'Refreshing...' : '↻ Refresh data'}
              </button>
            </header>

            {enquiryError && (
              <div
                role="alert"
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 10,
                  color: '#ffc4c4',
                  background: '#3a202c',
                  border: '1px solid #713c4b',
                }}
              >
                {enquiryError}
              </div>
            )}

            <div className="admin-cards">
              {[
                {
                  label: 'TOTAL ENQUIRIES',
                  value: enquiries.length,
                  note: 'All received messages',
                  icon: '✉',
                },
                {
                  label: "TODAY'S ENQUIRIES",
                  value: todayCount,
                  note: 'Received today',
                  icon: '◷',
                },
                {
                  label: 'SERVICES OFFERED',
                  value: services.length,
                  note: 'Available on website',
                  icon: '◇',
                },
              ].map((card) => (
                <article
                  key={card.label}
                  style={{
                    ...panelStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{
                      color: '#91a2bd',
                      fontSize: 10,
                      letterSpacing: 1.2,
                    }}>
                      {card.label}
                    </div>

                    <div style={{
                      fontSize: 32,
                      fontWeight: 800,
                      margin: '10px 0 5px',
                    }}>
                      {card.value}
                    </div>

                    <div style={{
                      color: '#7f90aa',
                      fontSize: 12,
                    }}>
                      {card.note}
                    </div>
                  </div>

                  <div style={{
                    width: 45,
                    height: 45,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 13,
                    background: '#263a5d',
                    color: '#dce8fb',
                    fontSize: 21,
                  }}>
                    {card.icon}
                  </div>
                </article>
              ))}
            </div>

            {activeTab === 'dashboard' ? (
              <section style={panelStyle}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 18,
                }}>
                  <div>
                    <h2 style={{ fontSize: 18, margin: 0 }}>
                      Recent enquiries
                    </h2>

                    <p style={{
                      color: '#8798b2',
                      fontSize: 12,
                      margin: '6px 0 0',
                    }}>
                      Latest messages received from customers.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('enquiries')}
                    style={{
                      ...buttonStyle,
                      background: '#263a5d',
                      color: '#eaf1fc',
                    }}
                  >
                    View all →
                  </button>
                </div>

                {loadingEnquiries ? (
                  <p>Loading enquiries...</p>
                ) : enquiries.length === 0 ? (
                  <p style={{ color: '#9aa9c0' }}>
                    No enquiries have been received yet.
                  </p>
                ) : (
                  <div className="admin-table-wrap">
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      minWidth: 620,
                    }}>
                      <thead>
                        <tr>
                          {['Name', 'Service', 'Email', 'Received'].map(
                            (heading) => (
                              <th key={heading} style={thStyle}>
                                {heading}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {enquiries.slice(0, 5).map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedEnquiry(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={tdStyle}>{item.name}</td>
                            <td style={tdStyle}>{item.service}</td>
                            <td style={tdStyle}>{item.email}</td>
                            <td style={tdStyle}>
                              {item.created_at
                                ? new Date(item.created_at).toLocaleDateString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : (
              <section style={panelStyle}>
                <div style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 18,
                }}>
                  <input
                    className="admin-input"
                    aria-label="Search enquiries"
                    placeholder="Search name, email, phone or message..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    style={{ flex: '1 1 240px' }}
                  />

                  <select
                    className="admin-input"
                    aria-label="Filter by service"
                    value={serviceFilter}
                    onChange={(event) => setServiceFilter(event.target.value)}
                    style={{ flex: '0 1 220px' }}
                  >
                    <option value="All">All services</option>

                    {Array.from(
                      new Set(
                        enquiries
                          .map((item) => item.service)
                          .filter(Boolean)
                      )
                    ).map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}>
                  <strong>
                    All messages ({filteredEnquiries.length})
                  </strong>

                  {(searchTerm || serviceFilter !== 'All') && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setServiceFilter('All')
                      }}
                      style={{
                        ...buttonStyle,
                        padding: '6px 10px',
                        color: '#c8d6ed',
                        background: '#26334a',
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {loadingEnquiries ? (
                  <p>Loading enquiries...</p>
                ) : filteredEnquiries.length === 0 ? (
                  <p style={{ color: '#9aa9c0' }}>
                    No matching enquiries found.
                  </p>
                ) : (
                  <div className="admin-table-wrap">
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      minWidth: 950,
                    }}>
                      <thead>
                        <tr>
                          {[
                            'ID',
                            'Customer',
                            'Contact',
                            'Service',
                            'Message',
                            'Date',
                            'Actions',
                          ].map((heading) => (
                            <th key={heading} style={thStyle}>
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredEnquiries.map((item) => (
                          <tr key={item.id}>
                            <td style={tdStyle}>#{item.id}</td>

                            <td style={tdStyle}>
                              <strong>{item.name}</strong>
                            </td>

                            <td style={tdStyle}>
                              <div>{item.email}</div>
                              <div style={{
                                color: '#8c9bb4',
                                marginTop: 5,
                              }}>
                                {item.phone}
                              </div>
                            </td>

                            <td style={tdStyle}>{item.service}</td>

                            <td style={{
                              ...tdStyle,
                              maxWidth: 230,
                              overflowWrap: 'anywhere',
                            }}>
                              {item.message}
                            </td>

                            <td style={tdStyle}>
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : '—'}
                            </td>

                            <td style={tdStyle}>
                              <div style={{
                                display: 'flex',
                                gap: 7,
                              }}>
                                <button
                                  onClick={() => setSelectedEnquiry(item)}
                                  style={{
                                    ...buttonStyle,
                                    padding: '7px 10px',
                                    color: '#dce8fb',
                                    background: '#263a5d',
                                  }}
                                >
                                  View
                                </button>

                                <button
                                  onClick={() => void deleteEnquiry(item.id)}
                                  disabled={deletingId === item.id}
                                  style={{
                                    ...buttonStyle,
                                    padding: '7px 10px',
                                    color: '#ffd5d5',
                                    background: '#542b38',
                                    opacity: deletingId === item.id ? 0.6 : 1,
                                  }}
                                >
                                  {deletingId === item.id ? '...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            <p style={{
              color: '#62738f',
              fontSize: 11,
              textAlign: 'center',
              marginTop: 25,
            }}>
              © 2026 RA–MORA Technologies · Secure Admin Panel
            </p>
          </section>
        </div>

        {selectedEnquiry && (
          <div
            onClick={() => setSelectedEnquiry(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 20,
              background: 'rgba(0,0,0,.72)',
              display: 'grid',
              placeItems: 'center',
              padding: 16,
            }}
          >
            <section
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Enquiry details"
              style={{
                width: 'min(100%, 560px)',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: '#111a2d',
                border: '1px solid #34445f',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 20px 70px rgba(0,0,0,.45)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  Enquiry details
                </h2>

                <button
                  onClick={() => setSelectedEnquiry(null)}
                  aria-label="Close details"
                  style={{
                    ...buttonStyle,
                    color: '#fff',
                    background: '#293750',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 16,
                marginTop: 22,
              }}>
                {[
                  ['Enquiry ID', `#${selectedEnquiry.id}`],
                  ['Customer', selectedEnquiry.name],
                  ['Email', selectedEnquiry.email],
                  ['Phone', selectedEnquiry.phone],
                  ['Service', selectedEnquiry.service],
                  [
                    'Date',
                    selectedEnquiry.created_at
                      ? new Date(selectedEnquiry.created_at).toLocaleString()
                      : '—',
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{
                      color: '#8fa1bd',
                      fontSize: 11,
                      marginBottom: 6,
                    }}>
                      {label}
                    </div>

                    <div style={{
                      overflowWrap: 'anywhere',
                      fontSize: 14,
                    }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{
                  color: '#8fa1bd',
                  fontSize: 11,
                  marginBottom: 7,
                }}>
                  MESSAGE
                </div>

                <p style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  margin: 0,
                  background: '#0b1424',
                  padding: 14,
                  borderRadius: 10,
                }}>
                  {selectedEnquiry.message || 'No message provided.'}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    )
  }

  // MAIN COMPANY WEBSITE

  return (
    <main>
      <nav className="navbar">
        <a className="logo" href="#home">
          RA<span>–</span>MORA<span> TECHNOLOGIES</span>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
        </div>

        <a className="nav-button" href="#contact">
          Let's Talk ↗
        </a>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <p className="eyebrow">
            INNOVATION · TECHNOLOGY · GROWTH
          </p>

          <h1>
            Crafting Tomorrow
            <br />
            Through <span>Technology.</span>
          </h1>

          <p className="hero-description">
            We transform ambitious ideas into powerful digital experiences
            with innovative technology and intelligent solutions.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#services">
              Explore Our Services ↗
            </a>

            <a className="secondary-button" href="#about">
              Discover RA-MORA
            </a>
          </div>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-one"></div>
          <div className="orbit orbit-two"></div>

          <div className="core">
            RA
            <br />
            <span>◆</span>
            <br />
            MORA
          </div>

          <div className="floating-tag">
            BUILD · INNOVATE · GROW
          </div>
        </div>

        <div className="hero-bottom">
          DIGITAL FUTURE / 001
        </div>
      </section>

      <section className="about section" id="about">
        <p className="eyebrow">WHO WE ARE</p>

        <h2>
          Technology that moves
          <br />
          your business <span>forward.</span>
        </h2>

        <p>
          RA-MORA Technologies creates digital solutions that help businesses
          work smarter, connect better and grow faster.
        </p>
      </section>

      <section className="services section" id="services">
        <p className="eyebrow">WHAT WE DO</p>

        <h2>
          Our <span>Services</span>
        </h2>

        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <div className="service-icon">
                {service.icon}
              </div>

              <h3>{service.title}</h3>
              <p>{service.desc}</p>

              <a href="#contact">Explore ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="contact section" id="contact">
        <p className="eyebrow">
          LET'S BUILD SOMETHING GREAT
        </p>

        <h2>
          Your next big idea
          <br />
          starts <span>right here.</span>
        </h2>

        <form className="contact-form" onSubmit={handleSubmit}>
          <input
            name="name"
            type="text"
            placeholder="Your Full Name"
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Your Email Address"
            required
          />

          <input
            name="phone"
            type="tel"
            placeholder="Your Phone Number"
            required
          />

          <select name="service" required defaultValue="">
            <option value="" disabled>
              Select a Service
            </option>
            <option>Website Development</option>
            <option>Mobile App Development</option>
            <option>Software Development</option>
            <option>AI & Machine Learning</option>
            <option>Business Automation</option>
            <option>Digital Marketing</option>
            <option>Other</option>
          </select>

          <textarea
            name="message"
            placeholder="Tell us about your project..."
            rows={5}
            required
          />

          <button className="primary-button" type="submit">
            Send Enquiry ↗
          </button>

          {formStatus && (
            <p role="status" aria-live="polite">
              {formStatus}
            </p>
          )}
        </form>
      </section>

      <footer>
        <a className="logo" href="#home">
          RA<span>–</span>MORA
        </a>

        <p>Crafting Tomorrow Through Technology.</p>

        <p>
          © 2026 RA-MORA Technologies. All rights reserved.
        </p>

        <a
          href="/admin"
          style={{
            color: 'inherit',
            opacity: 0.55,
            fontSize: 12,
          }}
        >
          Admin
        </a>
      </footer>
    </main>
  )
}

export default App