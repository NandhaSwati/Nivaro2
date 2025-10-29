import Container from './Container'

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-white/80">
      <Container>
        <div className="py-8 text-sm text-slate-500 flex items-center justify-between">
          <p>© {new Date().getFullYear()} Nivaro. All rights reserved.</p>
          <div className="hidden sm:flex gap-4">
            <a className="hover:text-blue-600" href="#">Privacy</a>
            <a className="hover:text-blue-600" href="#">Terms</a>
            <a className="hover:text-blue-600" href="#">Support</a>
          </div>
        </div>
      </Container>
    </footer>
  )
}
