export function SupportCard() {
  return (
    <div className="card w-full border-l-4 border-rose-400 text-left text-sm leading-relaxed">
      <p className="font-medium">It sounds like things are really heavy right now.</p>
      <p className="mt-1 text-stone-600 dark:text-stone-300">
        You don&apos;t have to carry it alone. If you&apos;re thinking about hurting yourself, please reach out to
        someone now. In the US you can call or text 988, in the UK and Ireland call Samaritans on 116 123, and
        elsewhere{" "}
        <a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">
          findahelpline.com
        </a>{" "}
        lists free, confidential lines. If you&apos;re in danger, call your local emergency number.
      </p>
    </div>
  );
}
