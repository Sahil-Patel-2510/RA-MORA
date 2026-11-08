
import { useState, useEffect, type FormEvent } from 'react'
import AdminLogin from './AdminLogin'
import './App.css'

const API_URL = 'http://localhost:8788'
interface Enquiry {
  id: number
  name: string
  email: string
  phone: string
  service: string
  message: string
  created_at: string
}

const cellStyle: React.CSSProperties = {
  padding: '14px',
  borderBottom: '1px solid #30364b',
  textAlign: 'left',
  verticalAlign: 'top',
}

const services = [
  {
    icon: '🌐',
    title: 'Web Development',
    desc: 'Modern, responsive and powerful websites for your business.',
  },
  {
    icon: '📱',
    title: 'Mobile Applications',
    desc: 'Smart mobile experiences designed around your customers.',
  },
  {
    icon: '⚙️',
    title: 'Software Solutions',
    desc: 'Custom software to simplify and grow your business.',
  },
  {
    icon: '🤖',
    title: 'AI & Machine Learning',
    desc: 'Intelligent technology that transforms business operations.',
  },
  {
    icon: '🔄',
    title: 'Business Automation',
    desc: 'Automate repetitive tasks and improve productivity.',
  },
  {
    icon: '📈',
    title: 'Digital Marketing',
    desc: 'Build your brand and reach the right audience.',
  },
]

function App() {
  const [formStatus, setFormStatus] = useState('')
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loadingEnquiries, setLoadingEnquiries] = useState(false)
  const [enquiryError, setEnquiryError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const isAdminPage = window.location.pathname === '/admin'

  // Check admin session
  useEffect(() => {
    if (!isAdminPage) {
      setCheckingAdmin(false)
      return
    }

    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/api/admin/me`, {
          credentials: 'include',
        })

        const data = await response.json()

        setAdminAuthenticated(
          response.ok && data.authenticated === true
        )
      } catch {
        setAdminAuthenticated(false)
      } finally {
        setCheckingAdmin(false)
      }
    }

    checkSession()
  }, [isAdminPage])

  // Load customer enquiries
  async function loadEnquiries() {
    setLoadingEnquiries(true)
    setEnquiryError('')

    try {
      const response = await fetch(
        `${API_URL}/api/admin/enquiries`,
        {
          credentials: 'include',
        }
      )

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

  // Automatically load enquiries after login
  useEffect(() => {
    if (isAdminPage && adminAuthenticated) {
      loadEnquiries()
    }
  }, [isAdminPage, adminAuthenticated])

  // Delete enquiry
  async function deleteEnquiry(id: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this enquiry?'
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
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to delete enquiry.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  // Admin logout
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
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Logout failed.'
      )
    }
  }

  // Contact form submission
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget
    const formData = new FormData(form)

    const enquiry = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      service: formData.get('service'),
      message: formData.get('message'),
    }

    setFormStatus('Submitting your enquiry...')

    try {
      const result = await fetch(`${API_URL}/api/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiry),
      })

      const response = await result.json()

      if (!result.ok) {
        throw new Error(
          response.message || 'Unable to submit enquiry.'
        )
      }

      setFormStatus('Enquiry submitted successfully!')
      form.reset()
    } catch (error) {
      setFormStatus(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      )
    }
  }

  // Admin page
  if (isAdminPage) {
    if (checkingAdmin) {
      return (
        <div style={{
          padding: 40,
          color: 'white',
          background: '#080b18',
          minHeight: '100vh',
        }}>
          Checking admin session...
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

    return (
      <div style={{
        minHeight: '100vh',
        background: '#080b18',
        color: 'white',
        padding: '30px',
        fontFamily: 'Arial, sans-serif',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
        }}>
          <div>
            <h1 style={{ marginBottom: '8px' }}>
              RA-MORA Admin Dashboard
            </h1>
            <p style={{ color: '#aab0c5' }}>
              Welcome, Admin!
            </p>
          </div>

          <button onClick={handleLogout} style={{
            padding: '12px 24px',
            background: '#7c5cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}>
            Logout
          </button>
        </header>

        <hr style={{
          borderColor: '#30364b',
          margin: '25px 0',
        }} />

        <h2>Customer Enquiries</h2>

        <div style={{
          background: '#151a2d',
          padding: '22px',
          borderRadius: '12px',
          margin: '20px 0',
          maxWidth: '260px',
        }}>
          <p style={{ color: '#aab0c5' }}>
            Total Enquiries
          </p>
          <h1 style={{
            color: '#a78bfa',
            fontSize: '38px',
            margin: '8px 0',
          }}>
            {enquiries.length}
          </h1>
        </div>

        <button
          onClick={loadEnquiries}
          disabled={loadingEnquiries}
          style={{
            padding: '12px 22px',
            background: '#7c5cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
            opacity: loadingEnquiries ? 0.6 : 1,
          }}
        >
          {loadingEnquiries ? 'Loading...' : '↻ Refresh Enquiries'}
        </button>

        {enquiryError && (
          <p style={{ color: '#ff7777' }}>
            {enquiryError}
          </p>
        )}

        {loadingEnquiries ? (
          <p>Loading customer enquiries...</p>
        ) : enquiries.length === 0 ? (
          <p style={{ color: '#aab0c5' }}>
            No customer enquiries found.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '1000px',
              background: '#151a2d',
            }}>
              <thead>
                <tr style={{ background: '#252b43' }}>
                  {[
                    'ID',
                    'Name',
                    'Email',
                    'Phone',
                    'Service',
                    'Message',
                    'Date',
                    'Action',
                  ].map((heading) => (
                    <th key={heading} style={cellStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {enquiries.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.id}</td>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={cellStyle}>{item.email}</td>
                    <td style={cellStyle}>{item.phone}</td>
                    <td style={cellStyle}>{item.service}</td>
                    <td style={{
                      ...cellStyle,
                      maxWidth: '220px',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                    }}>
                      {item.message}
                    </td>
                    <td style={cellStyle}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => deleteEnquiry(item.id)}
                        disabled={deletingId === item.id}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {deletingId === item.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Main company website
  return (
    <main>
      <nav className="navbar">
        <a className="logo" href="#">
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

          {formStatus && <p>{formStatus}</p>}
        </form>
      </section>

      <footer>
        <a className="logo" href="#">
          RA<span>–</span>MORA
        </a>

        <p>Crafting Tomorrow Through Technology.</p>

        <p>
          © 2026 RA-MORA Technologies. All rights reserved.
        </p>
      </footer>
    </main>
  )
}

export default App
