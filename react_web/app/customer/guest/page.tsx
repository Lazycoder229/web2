import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

// Guest checkout was removed: ordering now requires a customer account.
export default function GuestStartPage() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/customer/login", { replace: true })
  }, [navigate])
  return null
}
