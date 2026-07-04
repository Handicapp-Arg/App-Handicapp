import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad · HandicApp',
  description: 'Cómo HandicApp trata tus datos personales.',
};

// Página pública (sin login) — requerida por App Store / Google Play.
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Política de Privacidad — HandicApp</h1>
      <p className="mt-1 text-sm text-slate-500">Última actualización: 4 de julio de 2026</p>

      <Section title="1. Quiénes somos">
        <p>
          HandicApp es una plataforma de gestión ecuestre (web y aplicación móvil) que permite
          administrar caballos, su historial sanitario, eventos, entrenamientos, contratos y la
          operación de establecimientos. Esta política explica qué datos personales tratamos, con
          qué finalidad y cuáles son tus derechos.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Responsable del tratamiento: <strong>[Razón social / titular]</strong>, [domicilio],
          Argentina. Contacto: <a className="text-clay-600 underline" href="mailto:privacidad@handicapp.com.ar">privacidad@handicapp.com.ar</a>.
        </p>
      </Section>

      <Section title="2. Qué datos recopilamos">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, contraseña (cifrada), rol y, opcionalmente, teléfono y preferencia de contacto por WhatsApp.</li>
          <li><strong>Perfil:</strong> foto de avatar, foto de portada y, en el caso de veterinarios, número de matrícula y provincia.</li>
          <li><strong>Datos de tus caballos:</strong> nombre, raza, sexo, fecha de nacimiento, pelaje, número de registro/microchip, pedigrí y documentación asociada.</li>
          <li><strong>Registros operativos:</strong> eventos de salud, gastos, entrenamientos, tareas, rutinas diarias, notas y fotos de actividad.</li>
          <li><strong>Contratos:</strong> textos, firmas electrónicas (imagen del trazo), fecha y nombre del firmante.</li>
          <li><strong>Imágenes:</strong> fotos que subís de caballos, tareas o documentos.</li>
          <li><strong>Datos técnicos:</strong> información del dispositivo y registros de uso necesarios para el funcionamiento y la seguridad.</li>
        </ul>
      </Section>

      <Section title="3. Para qué usamos tus datos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Brindar el servicio: gestionar tus caballos, eventos, agenda, contratos y la operación del establecimiento.</li>
          <li>Autenticarte y mantener tu sesión de forma segura.</li>
          <li>Enviarte avisos y recordatorios (por ejemplo, vencimientos sanitarios), incluidos por WhatsApp si lo activás.</li>
          <li>Procesar suscripciones y pagos.</li>
          <li>Mejorar la aplicación y prevenir fraudes o abusos.</li>
        </ul>
      </Section>

      <Section title="4. Base legal y consentimiento">
        <p>
          Tratamos tus datos con tu consentimiento y para la ejecución del servicio que solicitás,
          conforme a la Ley N.º 25.326 de Protección de los Datos Personales de la República
          Argentina. Podés retirar tu consentimiento en cualquier momento eliminando tu cuenta o
          contactándonos.
        </p>
      </Section>

      <Section title="5. Con quién compartimos datos (proveedores)">
        <p>Para operar, usamos proveedores que tratan datos por cuenta nuestra:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Cloudinary</strong> — almacenamiento de las imágenes y firmas.</li>
          <li><strong>Mercado Pago</strong> — procesamiento de pagos y suscripciones. Los datos de tu tarjeta los maneja Mercado Pago; HandicApp no los almacena.</li>
          <li><strong>Resend</strong> — envío de correos electrónicos transaccionales.</li>
          <li><strong>Meta (WhatsApp Cloud API)</strong> — envío de recordatorios por WhatsApp, si lo activás.</li>
          <li><strong>Sentry</strong> — diagnóstico de errores de la aplicación.</li>
        </ul>
        <p className="mt-2">
          No vendemos tus datos personales. Solo los compartimos con estos proveedores en la medida
          necesaria para prestar el servicio, o cuando la ley lo exija.
        </p>
        <p className="mt-2">
          Para consultar el padrón genealógico, la app puede realizar búsquedas en registros
          públicos (por ejemplo, el Stud Book Argentino); esa información es pública y no incluye tus
          datos personales.
        </p>
      </Section>

      <Section title="6. Permisos del dispositivo">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Cámara:</strong> para sacar fotos de caballos, tareas o documentos. Solo se usa cuando lo activás.</li>
          <li><strong>Galería de fotos:</strong> para adjuntar imágenes que ya tenés en tu dispositivo.</li>
          <li><strong>Notificaciones:</strong> para enviarte avisos y recordatorios (si las habilitás).</li>
        </ul>
        <p className="mt-2">Podés revocar estos permisos en cualquier momento desde la configuración de tu dispositivo.</p>
      </Section>

      <Section title="7. Transferencias internacionales">
        <p>
          Algunos proveedores (Cloudinary, Sentry, Meta) pueden almacenar datos fuera de Argentina.
          En esos casos aplicamos las medidas de resguardo que exige la normativa vigente.
        </p>
      </Section>

      <Section title="8. Conservación">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa y durante el plazo necesario para
          cumplir obligaciones legales o contractuales. Si eliminás tu cuenta, borramos o
          anonimizamos tus datos personales, salvo lo que debamos conservar por ley.
        </p>
      </Section>

      <Section title="9. Tus derechos">
        <p>
          Como titular de los datos, tenés derecho a acceder, rectificar, actualizar y suprimir tus
          datos personales. Para ejercerlos, escribinos a{' '}
          <a className="text-clay-600 underline" href="mailto:privacidad@handicapp.com.ar">privacidad@handicapp.com.ar</a>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley
          N.º 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con
          relación al incumplimiento de las normas sobre protección de datos personales.
        </p>
      </Section>

      <Section title="10. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: cifrado de
          contraseñas, conexiones HTTPS y control de acceso por roles. Ningún sistema es
          completamente infalible, pero trabajamos para mantener tus datos seguros.
        </p>
      </Section>

      <Section title="11. Menores">
        <p>
          HandicApp está destinada a personas mayores de edad o profesionales del ámbito ecuestre. No
          recopilamos deliberadamente datos de menores de edad.
        </p>
      </Section>

      <Section title="12. Cambios en esta política">
        <p>
          Podemos actualizar esta política. Publicaremos la versión vigente en esta misma página con
          su fecha de actualización.
        </p>
      </Section>

      <Section title="13. Contacto">
        <p>
          Ante cualquier consulta sobre esta política o el tratamiento de tus datos, escribinos a{' '}
          <a className="text-clay-600 underline" href="mailto:privacidad@handicapp.com.ar">privacidad@handicapp.com.ar</a>.
        </p>
      </Section>

      <p className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
        HandicApp — Plataforma de gestión ecuestre · https://app.handicapp.com.ar
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}
