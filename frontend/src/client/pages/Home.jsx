import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../common/services/api'
import { useCart } from '../../common/context/CartContext'
import { useAuth } from '../../common/context/AuthContext'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

export default function Home() {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user, token } = useAuth()

  const [featuredItems, setFeaturedItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchImageUrl = useCallback(
    async filename => {
      if (!filename) return ''
      try {
        const res = await api.get(`/imagen/${filename}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        return res.data.image_url
      } catch {
        return ''
      }
    },
    [token]
  )

  useEffect(() => {
    const MAX_SLIDES = 6
    if (!token) {
      // placeholders si no está autenticado
      ;(async () => {
        const { data } = await api.get('/products/')
        setFeaturedItems(
          data.slice(0, MAX_SLIDES).map(p => ({
            ...p,
            imageUrl:
              'https://via.placeholder.com/300x300?text=Inicia+sesión',
            promotion: null,
          }))
        )
        setLoading(false)
      })()
      return
    }

    async function fetchWithImages() {
      setLoading(true)
      try {
        const { data: promos } = await api.get('/promotions/', {
          headers: { Authorization: `Bearer ${token}` },
        })

        const shuffle = arr => {
          const a = [...arr]
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
          }
          return a
        }

        // 1) Seleccionar hasta MAX_SLIDES promociones al azar
        let selPromos = promos
        if (promos.length > MAX_SLIDES) {
          selPromos = shuffle(promos).slice(0, MAX_SLIDES)
        }

        // 2) IDs de producto en promoción
        const promoIds = [
          ...new Set(selPromos.map(p => p.product_id).filter(Boolean)),
        ]

        // 3) Traer productos promocionados
        const promoProducts = await Promise.all(
          promoIds.map(id =>
            api.get(`/products/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        ).then(arr => arr.map(r => r.data))

        // 4) Unir con datos de promoción
        let items = promoProducts.map(prod => {
          const promo = selPromos.find(p => p.product_id === prod.id)
          return { ...prod, promotion: promo }
        })

        // 5) Cargar imagenes de todos los items promocionados
        items = await Promise.all(
          items.map(async p => ({
            ...p,
            imageUrl: await fetchImageUrl(p.image_filename),
          }))
        )

        // 6) Rellenar con random si quedan huecos
        if (items.length < MAX_SLIDES) {
          const { data: allProds } = await api.get('/products/', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const pool = allProds.filter(p => !promoIds.includes(p.id))
          const needed = MAX_SLIDES - items.length
          const randoms = shuffle(pool).slice(0, needed)
          const rndWithImg = await Promise.all(
            randoms.map(async p => ({
              ...p,
              imageUrl: await fetchImageUrl(p.image_filename),
              promotion: null,
            }))
          )
          items = items.concat(rndWithImg)
        }

        setFeaturedItems(items)
      } catch (e) {
        console.error(e)
        setFeaturedItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchWithImages()
  }, [token, fetchImageUrl])

  // Ahora mostramos siempre 3 slides, scroll por 1, infinite y autoplay a 30s
  const SLIDES_TO_SHOW = 3
  const count = featuredItems.length
  const slidesToShow = Math.min(count, SLIDES_TO_SHOW)

  const sliderSettings = {
    dots: true,
    infinite: count > slidesToShow,
    speed: 1200,
    slidesToShow,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 8000,
    pauseOnHover: true,
    arrows: true,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: Math.min(slidesToShow, 2) } },
      { breakpoint: 640, settings: { slidesToShow: 1 } },
    ],
  }

  const handleAdd = product => {
    if (!user) return navigate('/login')
    addToCart({ ...product, quantity: 1 })
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-center py-20 px-6">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          Compra fácil, recibe rápido, vive mejor
        </h1>
        <p className="text-xl mb-8">
          Medicamentos, cuidado personal y más… ¡a solo un clic!
        </p>
        <button
          onClick={() => navigate('/catalogo')}
          className="bg-yellow-300 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold shadow-lg transition"
        >
          Ver Catálogo
        </button>
      </section>

      {/* Carrusel dinámico 3×1 */}
      <section className="container mx-auto px-4 py-12 max-w-7xl">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          {featuredItems[0]?.promotion ? 'Ofertas Especiales' : 'Destacados'}
        </h2>

        {loading ? (
          <p className="text-center text-gray-500">Cargando...</p>
        ) : count > 0 ? (
          <Slider {...sliderSettings}>
            {featuredItems.map(p => (
              <div key={p.id} className="px-2">
                <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transform hover:scale-105 transition duration-300">
                  <div className="relative h-64 bg-gray-50">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                    {p.promotion && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs uppercase font-bold px-2 py-1 rounded">
                        {p.promotion.type === 'oferta'
                          ? `${p.promotion.offer_quantity}×${p.promotion.offer_pay}`
                          : `${p.promotion.discount_percent}% OFF`}
                      </span>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">
                      {p.name}
                    </h3>
                    <p className="text-xl font-bold text-purple-600 mb-4">
                      ${p.price.toFixed(2)}
                    </p>
                    <button
                      onClick={() => handleAdd(p)}
                      className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white py-2 rounded-xl font-semibold shadow-md transition"
                    >
                      Añadir al carrito
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        ) : (
          <p className="text-center text-gray-600">No hay productos disponibles.</p>
        )}
      </section>

      {/* Beneficios */}
      <section className="bg-white py-16 px-6 md:px-24 text-center">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">
          ¿Por qué elegirnos?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          <div className="space-y-3">
            <h3 className="font-semibold text-xl">Envío exprés</h3>
            <p>Recibe tu pedido en 24–48h, garantizado.</p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-xl">Soporte 24/7</h3>
            <p>Estamos siempre disponibles para ti.</p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-xl">Calidad premium</h3>
            <p>Trabajamos solo con las mejores marcas.</p>
          </div>
        </div>
      </section>

      {/* CTA App */}
      <section className="bg-gradient-to-r from-green-100 to-blue-100 py-20 px-6 md:px-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Lleva tu farmacia en el bolsillo</h2>
        <p className="mb-8">Descarga nuestra app y compra donde quieras.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-100 transition">
            App Store
          </button>
          <button className="px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-100 transition">
            Google Play
          </button>
        </div>
      </section>
    </>
  )
}
