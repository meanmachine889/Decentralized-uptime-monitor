import Earth from '@/components/ui/globe';

export default function Globe1() {
  return (
    <>
      <div className="w-full">
        <article className="w-full">
          <div className="relative">
            <Earth
              baseColor={[1, 0, 0.3]}
              markerColor={[1, 0, 0.33]}
              glowColor={[1, 0, 0.3]}
            />
          </div>
        </article>
      </div>
    </>
  );
}
