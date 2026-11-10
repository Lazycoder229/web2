import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function LegacyTableQr() {
  const { tableId = "" } = useParams()
  const navigate = useNavigate()
  useEffect(() => {
    navigate(`/customer?tableId=${encodeURIComponent(tableId)}`, { replace: true })
  }, [navigate, tableId])
  return null
}
