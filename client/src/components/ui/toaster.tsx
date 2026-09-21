import { useToast } from "@/hooks/use-toast"
import { toastDuration } from "@/components/ui/toast_timing"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          //  **والمهلةُ صريحةٌ من الثابت القانونيّ** لا من افتراض Radix
          //  الصامت (٥٠٠٠ms): الخطأُ يُمهَل أطولَ لأنه يُقرأ ويُتصرَّف به.
          //  وتُكتب **بعد** النشر فلا يطمسها `duration` قديمٌ في الحمولة —
          //  والدالّةُ نفسُها تُعيد الصريحَ متى وصل صالحاً.
          <Toast key={id} {...props} duration={toastDuration(props.variant, props.duration)}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
