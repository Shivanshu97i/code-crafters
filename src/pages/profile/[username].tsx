import { type GetStaticProps, type NextPage } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import Challenges from "~/components/Challenges";
import { MdiGithub, IcTwotoneEdit, TickOutline, RadixIconsCross2 } from "~/components/Icones";
import PageHeader from "~/components/PageHeader";
import { prisma } from "~/server/db";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { api } from "~/utils/api";

type Props = {
  username: string;
};


interface editBioForm extends HTMLFormElement {
  about: HTMLInputElement;
}

const ProfilePage: NextPage<Props> = ({ username }: Props) => {
  // const router = useRouter();
  const { data: user, refetch } = api.user.getUserByUsername.useQuery({
    username: username,
  });
  const { data: challenges } = api.challenge.getAllByUser.useQuery();
  const mutateAbout = api.user.editAbout.useMutation({
    onSuccess: async () => {
      await refetch();
    },
  });
  const [editBio, setEditBio] = useState(false);
  const { data: session } = useSession();

  if (!user) {
    return <div>loading...</div>;
  }
  const title = `Code Crafters | ${username}`;

  const bioEditHandler = (e: FormEvent<editBioForm>) => {
    e.preventDefault();
    if (!user || session?.user?.username !== username) {
      return;
    }
    const about = e.currentTarget.about.value.trim();
    setEditBio(false);
    if (!about) {
      return;
    }
    mutateAbout.mutate({
      about: about,
    });
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageHeader pageTitle="Profile" />
      <main>
        <section
          style={{
            clipPath: "inset(0 -100vmax)",
          }}
          className="mx-auto flex max-w-[80rem] flex-col items-center space-y-5 bg-white px-2 py-4 shadow-[0_0_0_100vmax] shadow-white md:flex-row md:space-x-8 md:space-y-0 md:px-6 md:py-8 "
        >
          <div>
            <Image
              className=" h-32 w-32 rounded-full md:h-40 md:w-40 "
              src={user.image || ""}
              alt="user"
              width={200}
              height={200}
            />
          </div>
          <div className="flex flex-[2] flex-col items-center justify-between gap-3 md:items-start ">
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-center text-2xl font-medium  text-gray-900 ">
                {user.name}
              </h3>
              <p className="  ">@{user.username}</p>
            </div>
            <Link target="_blank" href={(user.githubURL as string) || ""}>
              {user.githubURL && <MdiGithub className="h-8 w-8" />}
            </Link>
          </div>

          {editBio ? (
            <form
              onSubmit={bioEditHandler}
              className="flex flex-[3] items-center"
            >
              <input
                placeholder="Your bio"
                type="text"
                name="about"
                className="flex-1 border-b focus:outline-none"
                defaultValue={user.about || ""}
              />
              <button
                title="Submit"
                className=" duration-200 hover:text-blue-400 "
                type="submit"
              >
                <TickOutline className="" />
              </button>
              <button
                title="Cancel"
                className="ml-2 duration-200 hover:text-red-400 "
                onClick={()=>setEditBio(false)}
              >
                <RadixIconsCross2 className="" />
              </button>
              
            </form>
          ) : (
            <div className="flex flex-[3] items-center">
              <p className="flex-1 text-left">
                {user.about ||
                  "I’m a mysterious individual who has yet to fill out my bio. One thing’s for certain: I love writing code!"}
              </p>
              { session?.user.username===username && <button
                onClick={() => {
                  setEditBio(true);
                }}
                className="ml-2 "
                title="Edit"
              >
                <IcTwotoneEdit className="duration-200 hover:text-blue-400" />
              </button>}
            </div>
          )}
        </section>
        <section className="">
          <h3 className="my-8 text-center text-2xl font-semibold">
            All Challenges
          </h3>
          <Challenges challenges={challenges} />
        </section>
      </main>
    </>
  );
};

export const getStaticPaths = async () => {
  const users = await prisma.user.findMany({
    select: {
      username: true,
    },
  });
  return {
    paths: users.map((user) => ({
      params: {
        username: user.username,
      },
    })),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();
  const username = context.params?.username;

  if (typeof username !== "string") throw new Error("Slug is not a string");

  await ssg.user.getUserByUsername.prefetch({ username });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      username,
    },
  };
};

export default ProfilePage;
